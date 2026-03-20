import type { Database } from "../db.ts";
import type { ProjectRecord } from "./types.ts";

function mapProjectRow(row: Record<string, unknown>): ProjectRecord {
  return {
    createdAt: String(row.created_at ?? ""),
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
  };
}

export async function listProjects(db: Database) {
  const result = await db.client.execute(
    "SELECT id, name, created_at FROM projects ORDER BY created_at DESC",
  );

  return result.rows.map((row) => mapProjectRow(row as Record<string, unknown>));
}
