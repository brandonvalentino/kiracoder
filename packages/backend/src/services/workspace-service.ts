import { pickFolder } from "@kiracode/native";
import type { ReturnTypeCreateDbClient, ReturnTypeCreateRuntimeManager } from "../types.ts";

const defaultPresetId = "balanced";

export function createWorkspaceService(
  db: ReturnTypeCreateDbClient,
  runtimeManager: ReturnTypeCreateRuntimeManager,
) {
  return {
    async createWorkspace(projectId: string, name: string, cwd?: string) {
      const selectedCwd = cwd ?? (await pickFolder());
      const workspace = db.createWorkspace({
        projectId,
        name,
        cwd: selectedCwd,
        sessionFile: "pending",
        presetId: defaultPresetId,
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
    listWorkspaces(projectId: string) {
      return db.listWorkspaces(projectId);
    },
  };
}
