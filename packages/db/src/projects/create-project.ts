import type { Database } from "../db.ts";
import type { ProjectRecord } from "./types.ts";

export async function createProject(db: Database, project: ProjectRecord) {
  await db.client.execute({
    sql: "INSERT INTO projects (id, name, created_at) VALUES (?, ?, ?)",
    args: [project.id, project.name, project.createdAt],
  });

  return project;
}
