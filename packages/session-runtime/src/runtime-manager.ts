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

export function createRuntimeManager(sessionsDir: string) {
  const runtimes = new Map<string, WorkspaceRuntimeRecord>();
  const unsubscribers = new Map<string, () => void>();
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
      const existingRuntime = runtimes.get(workspace.id);
      if (existingRuntime) {
        return existingRuntime;
      }

      const runtime = await openWorkspaceSession(
        workspace.id,
        workspace.cwd,
        workspace.sessionFile,
        sessionsDir,
      );
      return bindRuntime(runtime);
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
    },
  };
}
