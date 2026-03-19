import { createWorkspaceSession, type WorkspaceRuntimeRecord } from "./create-session.ts";

export function createRuntimeManager(sessionsDir: string) {
  const runtimes = new Map<string, WorkspaceRuntimeRecord>();

  return {
    async createWorkspaceRuntime(workspaceId: string, cwd: string) {
      const runtime = await createWorkspaceSession(workspaceId, cwd, sessionsDir);
      runtimes.set(workspaceId, runtime);
      return runtime;
    },
    getWorkspaceRuntime(workspaceId: string) {
      return runtimes.get(workspaceId);
    },
    disposeWorkspaceRuntime(workspaceId: string) {
      const runtime = runtimes.get(workspaceId);
      runtime?.session.dispose();
      runtimes.delete(workspaceId);
    },
    disposeAll() {
      for (const runtime of runtimes.values()) {
        runtime.session.dispose();
      }
      runtimes.clear();
    },
  };
}
