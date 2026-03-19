import { randomUUID } from "node:crypto";

export type ProjectRecord = {
  id: string;
  name: string;
  createdAt: string;
};

export type WorkspaceRecord = {
  id: string;
  projectId: string;
  name: string;
  cwd: string;
  sessionFile: string;
  presetId: string;
  createdAt: string;
};

const projects = new Map<string, ProjectRecord>();
const workspaces = new Map<string, WorkspaceRecord>();

export function createDbClient() {
  return {
    createProject(name: string) {
      const project = {
        id: randomUUID(),
        name,
        createdAt: new Date().toISOString(),
      } satisfies ProjectRecord;
      projects.set(project.id, project);
      return project;
    },
    createWorkspace(input: Omit<WorkspaceRecord, "id" | "createdAt">) {
      const workspace = {
        ...input,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
      } satisfies WorkspaceRecord;
      workspaces.set(workspace.id, workspace);
      return workspace;
    },
    updateWorkspaceSessionFile(workspaceId: string, sessionFile: string) {
      const workspace = workspaces.get(workspaceId);
      if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }

      workspace.sessionFile = sessionFile;
      return workspace;
    },
    listProjects() {
      return [...projects.values()];
    },
    listWorkspaces(projectId: string) {
      return [...workspaces.values()].filter((workspace) => workspace.projectId === projectId);
    },
  };
}
