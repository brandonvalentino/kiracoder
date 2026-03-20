import type { Database } from "./db.ts";

export async function runMigrations(db: Database) {
  await db.client.executeMultiple(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_projects_created_at
    ON projects(created_at DESC);

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      cwd TEXT NOT NULL,
      session_file TEXT NOT NULL,
      preset_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_workspaces_project_id_created_at
    ON workspaces(project_id, created_at DESC);
  `);
}
