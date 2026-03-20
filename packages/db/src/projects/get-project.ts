import type { Database } from "../db.ts";
import type { ProjectRecord } from "./types.ts";

function mapProjectRow(row: Record<string, unknown>): ProjectRecord {
  return {
    createdAt: String(row.created_at ?? ""),
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
  };
}

export async function getProject(db: Database, projectId: string) {
  const result = await db.client.execute({
    sql: "SELECT id, name, created_at FROM projects WHERE id = ? LIMIT 1",
    args: [projectId],
  });

  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? mapProjectRow(row) : null;
}
