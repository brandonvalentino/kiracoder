import type { WorkspaceRepository, WorkspaceRecord } from "@kiracode/db";
import type { createRuntimeManager, WorkspaceRuntimeEvent } from "@kiracode/session-runtime";

export type RuntimeSummary = {
  cwd: string;
  sessionFile: string;
  sessionId: string;
  status: string;
  workspaceId: string;
};

export type WorkspaceService = {
  createWorkspace: (input: {
    projectId: string;
    name: string;
    cwd?: string;
  }) => Promise<{ runtime: RuntimeSummary; workspace: WorkspaceRecord }>;
  getMessages: (workspaceId: string) => Promise<unknown[]>;
  listWorkspaces: (projectId: string) => Promise<WorkspaceRecord[]>;
  promptWorkspace: (
    workspaceId: string,
    message: string,
  ) => Promise<{ messageCount: number; ok: true; workspaceId: string }>;
  /**
   * Discard the existing Pi session file, create a fresh session for the
   * same cwd, and update the workspace's session_file in the DB.
   * Used when the stored session file is missing or corrupt.
   */
  resetWorkspaceSession: (workspaceId: string) => Promise<WorkspaceRecord>;
  subscribeToWorkspaceEvents: (
    workspaceId: string,
    signal?: AbortSignal,
  ) => AsyncIterable<WorkspaceRuntimeEvent>;
};

export type CreateWorkspaceServiceDeps = {
  createId: () => string;
  now: () => string;
  pickFolder: () => Promise<string>;
  repository: WorkspaceRepository;
  runtimeManager: ReturnType<typeof createRuntimeManager>;
  sessionsDir: string;
};
