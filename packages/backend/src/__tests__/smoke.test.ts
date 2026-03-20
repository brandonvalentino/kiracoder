import { EventEmitter, on } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createBackendApp, createBackendServer } from "../server.ts";
import type { AppContext } from "../context.ts";

function makeStubContext() {
  const projects = new Map<string, { id: string; name: string; createdAt: string }>();
  const workspaces = new Map<
    string,
    {
      id: string;
      projectId: string;
      name: string;
      cwd: string;
      sessionFile: string;
      presetId: string;
      createdAt: string;
    }
  >();

  let idCounter = 0;
  const nextId = () => `stub-${++idCounter}`;
  const eventBus = new EventEmitter();

  const runtimeManager = {
    createWorkspaceRuntime: async (workspaceId: string, cwd: string) => ({
      workspaceId,
      cwd,
      sessionId: `sess-${workspaceId}`,
      sessionFile: `${workspaceId}.jsonl`,
      status: "idle" as const,
      session: {
        messages: [],
        prompt: async () => {},
        dispose: () => {},
        subscribe: () => () => {},
      },
    }),
    ensureWorkspaceRuntime: async (workspace: { id: string; cwd: string; sessionFile: string }) => ({
      workspaceId: workspace.id,
      cwd: workspace.cwd,
      sessionId: `sess-${workspace.id}`,
      sessionFile: workspace.sessionFile,
      status: "idle" as const,
      session: {
        messages: [],
        prompt: async () => {},
        dispose: () => {},
        subscribe: () => () => {},
      },
    }),
    getWorkspaceRuntime: (_workspaceId: string) => undefined,
    getWorkspaceMessages: async () => [],
    promptWorkspace: async (workspace: { id: string }, _msg: string) => ({
      messageCount: 0,
      ok: true,
      workspaceId: workspace.id,
    }),
    async *subscribeToWorkspaceEvents(workspaceId: string, signal?: AbortSignal) {
      for await (const [payload] of on(eventBus, workspaceId, { signal })) {
        yield payload as { event: unknown; workspaceId: string };
      }
    },
    disposeWorkspaceRuntime: (_workspaceId: string) => {},
    disposeAll: () => {},
  };

  const db = {
    createProject: (name: string) => {
      const project = { id: nextId(), name, createdAt: new Date().toISOString() };
      projects.set(project.id, project);
      return project;
    },
    listProjects: () => [...projects.values()],
    createWorkspace: (
      input: Omit<(typeof workspaces extends Map<string, infer Value> ? Value : never), "id" | "createdAt">,
    ) => {
      const workspace = { ...input, id: nextId(), createdAt: new Date().toISOString() };
      workspaces.set(workspace.id, workspace);
      return workspace;
    },
    getWorkspace: (workspaceId: string) => workspaces.get(workspaceId),
    updateWorkspaceSessionFile: (workspaceId: string, sessionFile: string) => {
      const workspace = workspaces.get(workspaceId);
      if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }
      workspace.sessionFile = sessionFile;
      return workspace;
    },
    listWorkspaces: (projectId: string) =>
      [...workspaces.values()].filter((workspace) => workspace.projectId === projectId),
  };

  const projectService = {
    createProject: (name: string) => db.createProject(name),
    listProjects: () => db.listProjects(),
  };

  const workspaceService = {
    async createWorkspace(projectId: string, name: string, cwd?: string) {
      const selectedCwd = cwd ?? os.tmpdir();
      const workspace = db.createWorkspace({
        projectId,
        name,
        cwd: selectedCwd,
        sessionFile: "pending",
        presetId: "balanced",
      });
      const runtime = await runtimeManager.createWorkspaceRuntime(workspace.id, selectedCwd);
      const persistedWorkspace = db.updateWorkspaceSessionFile(workspace.id, runtime.sessionFile);

      return {
        workspace: persistedWorkspace,
        runtime: {
          cwd: runtime.cwd,
          sessionFile: runtime.sessionFile,
          sessionId: runtime.sessionId,
          status: runtime.status,
          workspaceId: runtime.workspaceId,
        },
      };
    },
    listWorkspaces: (projectId: string) => db.listWorkspaces(projectId),
    getMessages: async (workspaceId: string) => {
      const workspace = db.getWorkspace(workspaceId);
      if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }
      return runtimeManager.getWorkspaceMessages();
    },
    promptWorkspace: async (workspaceId: string, message: string) => {
      const workspace = db.getWorkspace(workspaceId);
      if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }
      return runtimeManager.promptWorkspace(workspace, message);
    },
    subscribeToWorkspaceEvents: (workspaceId: string, signal?: AbortSignal) =>
      runtimeManager.subscribeToWorkspaceEvents(workspaceId, signal),
  };

  const context = {
    appRootDir: os.tmpdir(),
    sessionsDir: os.tmpdir(),
    db,
    projectService,
    runtimeManager,
    workspaceService,
  } as unknown as AppContext;

  return Object.assign(context, {
    emitWorkspaceEvent(workspaceId: string, event: unknown) {
      eventBus.emit(workspaceId, { event, workspaceId });
    },
    workspaceService,
  });
}

async function trpcQuery(
  app: ReturnType<typeof createBackendApp>,
  procedure: string,
  input?: unknown,
) {
  const url = input !== undefined
    ? `/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify(input))}`
    : `/trpc/${procedure}`;
  const response = await app.request(url, { method: "GET" });
  return response.json() as Promise<{ result?: { data?: unknown }; error?: unknown }>;
}

async function trpcMutation(
  app: ReturnType<typeof createBackendApp>,
  procedure: string,
  input: unknown,
) {
  const response = await app.request(`/trpc/${procedure}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.json() as Promise<{ result?: { data?: unknown }; error?: unknown }>;
}

describe("backend smoke tests", () => {
  describe("tRPC routing", () => {
    it("serves system health", async () => {
      const app = createBackendApp(makeStubContext());
      const body = await trpcQuery(app, "system.health");
      const data = (body as { result: { data: { status: string } } }).result.data;
      expect(data.status).toBe("ok");
    });

    it("creates and lists projects through /trpc", async () => {
      const app = createBackendApp(makeStubContext());

      const createBody = await trpcMutation(app, "projects.create", { name: "smoke-proj" });
      const created = (createBody as { result: { data: { id: string; name: string } } }).result
        .data;
      expect(created.name).toBe("smoke-proj");
      expect(typeof created.id).toBe("string");

      const listBody = await trpcQuery(app, "projects.list");
      const projects = (listBody as { result: { data: unknown[] } }).result.data;
      expect(projects).toHaveLength(1);
    });

    it("does not 5xx on an unknown procedure", async () => {
      const app = createBackendApp(makeStubContext());
      const response = await app.request("/trpc/nonexistent.proc");
      expect(response.status).toBeLessThan(500);
    });
  });

  describe("static delivery", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kc-static-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("serves an existing static file with the expected content type", async () => {
      fs.writeFileSync(path.join(tmpDir, "style.css"), "body { color: red; }");

      const app = createBackendApp(makeStubContext(), { distDir: tmpDir });
      const response = await app.request("/style.css");

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/css");
      expect(await response.text()).toContain("color: red");
    });

    it("returns the build-missing page when dist is unavailable", async () => {
      const app = createBackendApp(makeStubContext(), { distDir: "/nonexistent-kiracode-dist" });
      const response = await app.request("/");

      expect(response.status).toBe(200);
      expect(await response.text()).toContain("frontend not built");
    });

    it("falls back to index.html for SPA routes", async () => {
      fs.writeFileSync(path.join(tmpDir, "index.html"), "<html>app shell</html>");

      const app = createBackendApp(makeStubContext(), { distDir: tmpDir });
      const response = await app.request("/projects/123");

      expect(response.status).toBe(200);
      expect(await response.text()).toContain("app shell");
    });

    it("returns 405 for non-GET non-tRPC requests", async () => {
      const app = createBackendApp(makeStubContext(), { distDir: tmpDir });
      const response = await app.request("/not-an-api-route", { method: "POST" });
      expect(response.status).toBe(405);
    });

    it("does not emit wildcard CORS headers for disallowed origins", async () => {
      const app = createBackendApp(makeStubContext(), { distDir: tmpDir });
      const response = await app.request("/", {
        headers: {
          Origin: "https://example.com",
        },
      });

      expect(response.headers.get("access-control-allow-origin")).toBeNull();
    });
  });

  describe("startup and shutdown lifecycle", () => {
    it("binds a port and serves requests", async () => {
      const server = createBackendServer({ context: makeStubContext() });
      const address = await server.start(0);

      expect(address.port).toBeGreaterThan(0);
      expect(address.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
      expect(address.apiUrl).toContain("/trpc/");

      const response = await fetch(`${address.url}/trpc/system.health`);
      expect(response.ok).toBe(true);

      await server.stop();
      await expect(fetch(`${address.url}/trpc/system.health`)).rejects.toThrow();
    });

    it("can stop before start without throwing", async () => {
      const server = createBackendServer({ context: makeStubContext() });
      await expect(server.stop()).resolves.not.toThrow();
    });
  });

  describe("workspace event path", () => {
    it("observes a real workspace event through the workspace service subscription path", async () => {
      const context = makeStubContext();
      const app = createBackendApp(context);

      const projectBody = await trpcMutation(app, "projects.create", { name: "events-proj" });
      const project = (projectBody as { result: { data: { id: string } } }).result.data;

      const workspaceBody = await trpcMutation(app, "workspaces.create", {
        projectId: project.id,
        name: "events-workspace",
        cwd: os.tmpdir(),
      });
      const workspace =
        (workspaceBody as { result: { data: { workspace: { id: string } } } }).result.data.workspace;

      const abortController = new AbortController();
      const events = context.workspaceService.subscribeToWorkspaceEvents(
        workspace.id,
        abortController.signal,
      );

      setTimeout(() => {
        context.emitWorkspaceEvent(workspace.id, { type: "thinking" });
      }, 10);

      const { value } = await events.next();
      abortController.abort();

      expect(value?.workspaceId).toBe(workspace.id);
      expect((value?.event as { type: string }).type).toBe("thinking");
    });
  });
});
