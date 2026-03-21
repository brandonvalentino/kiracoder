import type { Database } from "../db.ts";
import type { ProjectRecord } from "./types.ts";
import { getProject } from "./get-project.ts";

export async function deleteProject(db: Database, projectId: string): Promise<ProjectRecord | undefined> {
  const project = await getProject(db, projectId);
  if (!project) return undefined;
  
  await db.client.execute({
    sql: "DELETE FROM projects WHERE id = ?",
    args: [projectId],
  });

  return project;
}
