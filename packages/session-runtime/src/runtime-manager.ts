import fs from "node:fs";
import path from "node:path";
import { EventEmitter, on } from "node:events";
import {
  createWorkspaceSession,
  openWorkspaceSession,
  type WorkspaceRuntimeRecord,
} from "./create-session.ts";

export type RuntimeWorkspaceRef = {
  cwd: string;
  id: string;
  sessionFile: string;
};

export type WorkspaceRuntimeEvent = {
  event: unknown;
  workspaceId: string;
};

function resolveSessionFile(sessionFile: string, sessionsDir: string) {
  return path.isAbsolute(sessionFile) ? sessionFile : path.join(sessionsDir, sessionFile);
}

export function createRuntimeManager(sessionsDir: string) {
  const runtimes = new Map<string, WorkspaceRuntimeRecord>();
  const unsubscribers = new Map<string, () => void>();
  /**
   * Tracks in-flight openWorkspaceSession calls so that concurrent callers
   * for the same workspaceId share a single promise instead of each spawning
   * an independent Pi session.  Cleaned up (success or failure) before
   * bindRuntime adds the result to `runtimes`.
   */
  const pending = new Map<string, Promise<WorkspaceRuntimeRecord>>();
  const events = new EventEmitter();

  function bindRuntime(runtime: WorkspaceRuntimeRecord) {
    unsubscribers.get(runtime.workspaceId)?.();
    const unsubscribe = runtime.session.subscribe((event) => {
      events.emit(runtime.workspaceId, {
        event,
        workspaceId: runtime.workspaceId,
      } satisfies WorkspaceRuntimeEvent);
    });

    unsubscribers.set(runtime.workspaceId, unsubscribe);
    runtimes.set(runtime.workspaceId, runtime);
    return runtime;
  }

  return {
    async createWorkspaceRuntime(workspaceId: string, cwd: string) {
      const runtime = await createWorkspaceSession(workspaceId, cwd, sessionsDir);
      return bindRuntime(runtime);
    },

    async ensureWorkspaceRuntime(workspace: RuntimeWorkspaceRef) {
      // Fast path — runtime already loaded.
      const existing = runtimes.get(workspace.id);
      if (existing) return existing;

      // Coalesce concurrent callers: if a load is already in flight for this
      // workspace, attach to that promise instead of opening a second session.
      const inflight = pending.get(workspace.id);
      if (inflight) return inflight;

      const resolvedSessionFile = resolveSessionFile(workspace.sessionFile, sessionsDir);
      if (!fs.existsSync(resolvedSessionFile)) {
        throw new Error(`Session file not found: ${resolvedSessionFile}`);
      }

      const promise = openWorkspaceSession(
        workspace.id,
        workspace.cwd,
        resolvedSessionFile,
        sessionsDir,
      )
        .then(bindRuntime)
        .finally(() => {
          pending.delete(workspace.id);
        });

      pending.set(workspace.id, promise);
      return promise;
    },

    getWorkspaceRuntime(workspaceId: string) {
      return runtimes.get(workspaceId);
    },

    async getWorkspaceMessages(workspace: RuntimeWorkspaceRef) {
      const runtime = await this.ensureWorkspaceRuntime(workspace);
      return runtime.session.messages;
    },

    async promptWorkspace(workspace: RuntimeWorkspaceRef, message: string) {
      const runtime = await this.ensureWorkspaceRuntime(workspace);
      await runtime.session.prompt(message);

      return {
        messageCount: runtime.session.messages.length,
        ok: true,
        workspaceId: workspace.id,
      };
    },

    async *subscribeToWorkspaceEvents(workspaceId: string, signal?: AbortSignal) {
      for await (const [payload] of on(events, workspaceId, { signal })) {
        yield payload as WorkspaceRuntimeEvent;
      }
    },

    disposeWorkspaceRuntime(workspaceId: string) {
      const runtime = runtimes.get(workspaceId);
      unsubscribers.get(workspaceId)?.();
      unsubscribers.delete(workspaceId);
      runtime?.session.dispose();
      runtimes.delete(workspaceId);
    },

    disposeAll() {
      for (const [workspaceId, runtime] of runtimes.entries()) {
        unsubscribers.get(workspaceId)?.();
        runtime.session.dispose();
      }
      unsubscribers.clear();
      runtimes.clear();
      // Pending promises will resolve/reject naturally; clearing the map
      // prevents new callers from joining them but does not abort the work.
      pending.clear();
    },
  };
}
