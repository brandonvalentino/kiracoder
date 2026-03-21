export type WorkspaceRecord = {
  id: string;
  projectId: string;
  name: string;
  cwd: string;
  sessionFile: string;
  presetId: string;
  createdAt: string;
};

export type WorkspaceRepository = {
  create: (workspace: WorkspaceRecord) => Promise<WorkspaceRecord>;
  getById: (workspaceId: string) => Promise<WorkspaceRecord | null>;
  listByProject: (projectId: string) => Promise<WorkspaceRecord[]>;
  updateSessionFile: (workspaceId: string, sessionFile: string) => Promise<WorkspaceRecord>;
  delete: (workspaceId: string) => Promise<WorkspaceRecord | undefined>;
};
