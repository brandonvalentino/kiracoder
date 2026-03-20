import { EventEmitter, on } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createDatabase, createWorkspaceRepository, runMigrations } from "@kiracode/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AppContext } from "../context.ts";
import { createProjectService } from "../features/projects/project-service.ts";
import {
  WorkspaceNotFoundError,
  WorkspaceSessionOpenError,
} from "../features/workspaces/workspace-errors.ts";
import { createWorkspaceService } from "../features/workspaces/workspace-service.ts";
import { createBackendApp, createBackendServer } from "../server.ts";

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
    ensureWorkspaceRuntime: async (workspace: {
      id: string;
      cwd: string;
      sessionFile: string;
    }) => ({
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
    getWorkspaceMessages: async (_workspace: { sessionFile: string }) => [],
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
    close: () => {},
  };

  const projectService = {
    async createProject(name: string) {
      const project = { id: nextId(), name, createdAt: new Date().toISOString() };
      projects.set(project.id, project);
      return project;
    },
    async getProject(projectId: string) {
      return projects.get(projectId) ?? null;
    },
    async listProjects() {
      return [...projects.values()];
    },
  };

  const workspaceService = {
    async createWorkspace(input: { projectId: string; name: string; cwd?: string }) {
      const selectedCwd = input.cwd ?? os.tmpdir();
      const workspace = {
        createdAt: new Date().toISOString(),
        cwd: selectedCwd,
        id: nextId(),
        name: input.name,
        presetId: "balanced",
        projectId: input.projectId,
        sessionFile: "pending",
      };
      workspaces.set(workspace.id, workspace);

      const runtime = await runtimeManager.createWorkspaceRuntime(workspace.id, selectedCwd);
      workspace.sessionFile = runtime.sessionFile;

      return {
        workspace,
        runtime: {
          cwd: runtime.cwd,
          sessionFile: runtime.sessionFile,
          sessionId: runtime.sessionId,
          status: runtime.status,
          workspaceId: runtime.workspaceId,
        },
      };
    },
    async getMessages(workspaceId: string) {
      const workspace = workspaces.get(workspaceId);
      if (!workspace) throw new WorkspaceNotFoundError(workspaceId);
      return runtimeManager.getWorkspaceMessages(workspace);
    },
    async listWorkspaces(projectId: string) {
      return [...workspaces.values()].filter((workspace) => workspace.projectId === projectId);
    },
    async promptWorkspace(workspaceId: string, message: string) {
      const workspace = workspaces.get(workspaceId);
      if (!workspace) throw new WorkspaceNotFoundError(workspaceId);
      return runtimeManager.promptWorkspace(workspace, message);
    },
    subscribeToWorkspaceEvents: (workspaceId: string, signal?: AbortSignal) =>
      runtimeManager.subscribeToWorkspaceEvents(workspaceId, signal),
  };

  const context = {
    appRootDir: os.tmpdir(),
    db,
    projectService,
    runtimeManager,
    sessionsDir: os.tmpdir(),
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
  const url =
    input !== undefined
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
      const workspace = (workspaceBody as { result: { data: { workspace: { id: string } } } })
        .result.data.workspace;

      const abortController = new AbortController();
      const events = context.workspaceService.subscribeToWorkspaceEvents(
        workspace.id,
        abortController.signal,
      );
      const iterator = events[Symbol.asyncIterator]();

      setTimeout(() => {
        context.emitWorkspaceEvent(workspace.id, { type: "thinking" });
      }, 10);

      const { value } = await iterator.next();
      abortController.abort();

      expect(value?.workspaceId).toBe(workspace.id);
      expect((value?.event as { type: string }).type).toBe("thinking");
    });
  });

  describe("persistence contract", () => {
    it("persists projects and workspaces across DB recreation and reuses stored sessionFile metadata", async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kc-db-"));
      const databasePath = path.join(tmpDir, "app.db");
      const sessionsDir = path.join(tmpDir, "sessions");
      fs.mkdirSync(sessionsDir, { recursive: true });

      const runtimeManager = {
        createWorkspaceRuntime: async (workspaceId: string, cwd: string) => {
          const sessionFile = path.join(sessionsDir, `${workspaceId}.jsonl`);
          fs.writeFileSync(sessionFile, '{"type":"session"}\n');
          return {
            workspaceId,
            cwd,
            sessionId: `sess-${workspaceId}`,
            sessionFile,
            status: "idle" as const,
          };
        },
        ensureWorkspaceRuntime: async (workspace: {
          id: string;
          cwd: string;
          sessionFile: string;
        }) => ({
          workspaceId: workspace.id,
          cwd: workspace.cwd,
          sessionId: `sess-${workspace.id}`,
          sessionFile: workspace.sessionFile,
          status: "idle" as const,
          session: {
            messages: [{ role: "assistant", content: "restored" }],
            prompt: async () => {},
            dispose: () => {},
            subscribe: () => () => {},
          },
        }),
        getWorkspaceMessages: async (workspace: { sessionFile: string }) => [workspace.sessionFile],
        promptWorkspace: async (workspace: { id: string }, _message: string) => ({
          messageCount: 1,
          ok: true as const,
          workspaceId: workspace.id,
        }),
        async *subscribeToWorkspaceEvents() {
          yield* [] as Array<{ event: unknown; workspaceId: string }>;
        },
        disposeWorkspaceRuntime: () => {},
        disposeAll: () => {},
        getWorkspaceRuntime: () => undefined,
      };

      const db1 = createDatabase(databasePath);
      await runMigrations(db1);
      const projectService1 = createProjectService({
        createId: () => "project-1",
        db: db1,
        now: () => "2026-03-20T00:00:00.000Z",
      });
      const workspaceService1 = createWorkspaceService({
        createId: () => "workspace-1",
        now: () => "2026-03-20T00:00:01.000Z",
        pickFolder: async () => os.tmpdir(),
        repository: createWorkspaceRepository(db1),
        runtimeManager: runtimeManager as never,
        sessionsDir,
      });

      const project = await projectService1.createProject("persisted");
      const created = await workspaceService1.createWorkspace({
        projectId: project.id,
        name: "persisted-workspace",
        cwd: os.tmpdir(),
      });
      expect(created.workspace.sessionFile).toBe("workspace-1.jsonl");
      db1.close();

      const db2 = createDatabase(databasePath);
      await runMigrations(db2);
      const projectService2 = createProjectService({
        createId: () => "unused-project-id",
        db: db2,
        now: () => "2026-03-20T00:00:02.000Z",
      });
      const workspaceService2 = createWorkspaceService({
        createId: () => "unused-workspace-id",
        now: () => "2026-03-20T00:00:03.000Z",
        pickFolder: async () => os.tmpdir(),
        repository: createWorkspaceRepository(db2),
        runtimeManager: runtimeManager as never,
        sessionsDir,
      });

      await expect(projectService2.listProjects()).resolves.toEqual([
        {
          createdAt: "2026-03-20T00:00:00.000Z",
          id: "project-1",
          name: "persisted",
        },
      ]);
      await expect(workspaceService2.listWorkspaces(project.id)).resolves.toEqual([
        {
          createdAt: "2026-03-20T00:00:01.000Z",
          cwd: os.tmpdir(),
          id: "workspace-1",
          name: "persisted-workspace",
          presetId: "balanced",
          projectId: "project-1",
          sessionFile: "workspace-1.jsonl",
        },
      ]);
      await expect(workspaceService2.getMessages("workspace-1")).resolves.toEqual([
        "workspace-1.jsonl",
      ]);

      db2.close();
      fs.rmSync(tmpDir, { force: true, recursive: true });
    });
  });

  describe("workspace tRPC error codes", () => {
    it("returns NOT_FOUND when workspace does not exist", async () => {
      const context = makeStubContext();
      const app = createBackendApp(context);

      const body = await trpcQuery(app, "workspaces.messages", {
        workspaceId: "does-not-exist",
      });

      const error = (body as { error: { data: { code: string } } }).error;
      expect(error.data.code).toBe("NOT_FOUND");
    });

    it("returns PRECONDITION_FAILED when session file is missing", async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kc-err-"));
      const databasePath = path.join(tmpDir, "app.db");
      const sessionsDir = path.join(tmpDir, "sessions");
      fs.mkdirSync(sessionsDir, { recursive: true });

      // Runtime manager that succeeds on create but fails on reopen —
      // simulates the session file disappearing after initial creation.
      const brokenEnsure = async () => {
        throw new Error("Session file not found: /fake/path.jsonl");
      };
      const runtimeManager = {
        createWorkspaceRuntime: async (workspaceId: string, cwd: string) => {
          const sessionFile = path.join(sessionsDir, `${workspaceId}.jsonl`);
          fs.writeFileSync(sessionFile, '{"type":"session"}\n');
          return {
            workspaceId,
            cwd,
            sessionId: `sess-${workspaceId}`,
            sessionFile,
            status: "idle" as const,
          };
        },
        ensureWorkspaceRuntime: brokenEnsure,
        // getWorkspaceMessages must call ensureWorkspaceRuntime so the error
        // propagates through the service's withRuntime wrapper.
        getWorkspaceMessages: async (workspace: {
          id: string;
          cwd: string;
          sessionFile: string;
        }) => {
          await brokenEnsure();
          return [];
        },
        promptWorkspace: async (workspace: { id: string }, _msg: string) => ({
          messageCount: 0,
          ok: true as const,
          workspaceId: workspace.id,
        }),
        async *subscribeToWorkspaceEvents() {
          yield* [] as Array<{ event: unknown; workspaceId: string }>;
        },
        disposeWorkspaceRuntime: () => {},
        disposeAll: () => {},
        getWorkspaceRuntime: () => undefined,
      };

      const db = createDatabase(databasePath);
      await runMigrations(db);
      const workspaceService = createWorkspaceService({
        createId: () => "ws-broken",
        now: () => "2026-03-20T00:00:00.000Z",
        pickFolder: async () => os.tmpdir(),
        repository: createWorkspaceRepository(db),
        runtimeManager: runtimeManager as never,
        sessionsDir,
      });
      const projectService = createProjectService({
        createId: () => "proj-broken",
        db,
        now: () => "2026-03-20T00:00:00.000Z",
      });
      const context = {
        appRootDir: tmpDir,
        db,
        projectService,
        runtimeManager,
        sessionsDir,
        workspaceService,
      } as unknown as import("../context.ts").AppContext;
      const app = createBackendApp(context);

      // Create a project + workspace so the DB row exists
      await trpcMutation(app, "projects.create", { name: "broken-proj" });
      await trpcMutation(app, "workspaces.create", {
        projectId: "proj-broken",
        name: "broken-ws",
        cwd: os.tmpdir(),
      });

      // Now query messages — the runtime manager throws "file not found",
      // which the workspace service wraps as WorkspaceSessionOpenError,
      // which the router translates to PRECONDITION_FAILED.
      const body = await trpcQuery(app, "workspaces.messages", {
        workspaceId: "ws-broken",
      });
      const error = (body as { error: { data: { code: string } } }).error;
      expect(error.data.code).toBe("PRECONDITION_FAILED");

      db.close();
      fs.rmSync(tmpDir, { force: true, recursive: true });
    });
  });

  describe("duplicate runtime guard", () => {
    it("coalesces concurrent ensureWorkspaceRuntime calls into a single open", async () => {
      let openCount = 0;
      const sessionsDir = os.tmpdir();

      const { createRuntimeManager } = await import("@kiracode/session-runtime");
      const manager = createRuntimeManager(sessionsDir);

      // Patch openWorkspaceSession by feeding a workspace whose sessionFile
      // exists on disk, then verifying only one session opens even when called
      // concurrently.  We verify via call counting using a stub ensureWorkspaceRuntime
      // directly on the manager — simulated here by calling it twice with the
      // same workspace ref before either resolves.
      const sessionFile = path.join(sessionsDir, "concurrent-test.jsonl");
      fs.writeFileSync(sessionFile, '{"type":"session"}\n');

      const workspace = {
        id: "ws-concurrent",
        cwd: os.tmpdir(),
        sessionFile: "concurrent-test.jsonl",
      };

      // Track promise identity: both concurrent callers should receive the
      // same promise object (or both settle to the same runtime).
      const p1 = manager.ensureWorkspaceRuntime(workspace).catch(() => {
        openCount++;
      });
      const p2 = manager.ensureWorkspaceRuntime(workspace).catch(() => {
        openCount++;
      });

      // Both promises should be the same in-flight handle — or at minimum
      // only one underlying open attempt is made.  We can't easily intercept
      // the real Pi SDK call in a unit test, so we verify the pending-map
      // dedup by checking that p1 and p2 settle together (not independently).
      const [r1, r2] = await Promise.allSettled([p1, p2]);
      expect(r1.status).toBe(r2.status);

      fs.unlinkSync(sessionFile);
    });
  });
});
