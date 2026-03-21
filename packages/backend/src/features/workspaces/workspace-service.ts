import path from "node:path";
import type { WorkspaceRecord } from "@kiracode/db";
import type { CreateWorkspaceServiceDeps, WorkspaceService } from "./workspace-types.ts";
import { WorkspaceNotFoundError, WorkspaceSessionOpenError } from "./workspace-errors.ts";

const defaultPresetId = "balanced";

function toStoredSessionFile(sessionFile: string, sessionsDir: string) {
  const relativePath = path.relative(sessionsDir, sessionFile);
  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return sessionFile;
  }
  return relativePath;
}

export function createWorkspaceService(deps: CreateWorkspaceServiceDeps): WorkspaceService {
  async function requireWorkspace(workspaceId: string) {
    const workspace = await deps.repository.getById(workspaceId);
    if (!workspace) {
      throw new WorkspaceNotFoundError(workspaceId);
    }
    return workspace;
  }

  async function withRuntime<T>(workspace: WorkspaceRecord, action: () => Promise<T>) {
    try {
      return await action();
    } catch (error) {
      throw new WorkspaceSessionOpenError(
        `Failed to open workspace session for ${workspace.id}: ${workspace.sessionFile}`,
        { cause: error },
      );
    }
  }

  return {
    async createWorkspace(input) {
      const selectedCwd = input.cwd ?? (await deps.pickFolder());
      const workspaceId = deps.createId();
      const runtime = await deps.runtimeManager.createWorkspaceRuntime(workspaceId, selectedCwd);
      const workspace = await deps.repository.create({
        createdAt: deps.now(),
        cwd: selectedCwd,
        id: workspaceId,
        name: input.name.trim(),
        presetId: defaultPresetId,
        projectId: input.projectId,
        sessionFile: toStoredSessionFile(runtime.sessionFile, deps.sessionsDir),
      });

      return {
        runtime: {
          cwd: runtime.cwd,
          sessionFile: runtime.sessionFile,
          sessionId: runtime.sessionId,
          status: runtime.status,
          workspaceId: runtime.workspaceId,
        },
        workspace,
      };
    },
    async getMessages(workspaceId) {
      const workspace = await requireWorkspace(workspaceId);
      return withRuntime(workspace, () => deps.runtimeManager.getWorkspaceMessages(workspace));
    },
    async listWorkspaces(projectId) {
      return deps.repository.listByProject(projectId);
    },
    async promptWorkspace(workspaceId, message) {
      const workspace = await requireWorkspace(workspaceId);
      return withRuntime(workspace, async () => {
        const result = await deps.runtimeManager.promptWorkspace(workspace, message);
        return { ...result, ok: true as const };
      });
    },
    async resetWorkspaceSession(workspaceId) {
      const workspace = await requireWorkspace(workspaceId);
      // Dispose the cached runtime (if any) so the old session is fully torn down
      // before we create a fresh one.
      deps.runtimeManager.disposeWorkspaceRuntime(workspaceId);
      const runtime = await deps.runtimeManager.createWorkspaceRuntime(workspaceId, workspace.cwd);
      return deps.repository.updateSessionFile(
        workspaceId,
        toStoredSessionFile(runtime.sessionFile, deps.sessionsDir),
      );
    },

    async deleteWorkspace(workspaceId) {
      deps.runtimeManager.disposeWorkspaceRuntime(workspaceId);
      return deps.repository.delete(workspaceId);
    },

    async *subscribeToWorkspaceEvents(workspaceId, signal) {
      await requireWorkspace(workspaceId);
      yield* deps.runtimeManager.subscribeToWorkspaceEvents(workspaceId, signal);
    },
  };
}
