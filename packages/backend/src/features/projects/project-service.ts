import { createProject, getProject, listProjects } from "@kiracode/db";
import type { CreateProjectServiceDeps, ProjectService } from "./types.ts";

export function createProjectService(deps: CreateProjectServiceDeps): ProjectService {
  return {
    async createProject(name) {
      const trimmedName = name.trim();
      return createProject(deps.db, {
        createdAt: deps.now(),
        id: deps.createId(),
        name: trimmedName,
      });
    },
    async getProject(projectId) {
      return getProject(deps.db, projectId);
    },
    async listProjects() {
      return listProjects(deps.db);
    },
  };
}
