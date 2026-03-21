import type { Database, ProjectRecord } from "@kiracode/db";

export type ProjectService = {
  createProject: (name: string) => Promise<ProjectRecord>;
  getProject: (projectId: string) => Promise<ProjectRecord | null>;
  listProjects: () => Promise<ProjectRecord[]>;
  deleteProject: (projectId: string) => Promise<ProjectRecord | undefined>;
};

export type CreateProjectServiceDeps = {
  createId: () => string;
  db: Database;
  now: () => string;
};
