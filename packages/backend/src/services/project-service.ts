import type { ReturnTypeCreateDbClient } from "../types.ts";

export function createProjectService(db: ReturnTypeCreateDbClient) {
  return {
    createProject(name: string) {
      return db.createProject(name);
    },
    listProjects() {
      return db.listProjects();
    },
  };
}
