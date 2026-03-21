import type { Database } from "../db.ts";
import type { WorkspaceRecord, WorkspaceRepository } from "./types.ts";

function mapWorkspaceRow(row: Record<string, unknown>): WorkspaceRecord {
  return {
    createdAt: String(row.created_at ?? ""),
    cwd: String(row.cwd ?? ""),
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    presetId: String(row.preset_id ?? ""),
    projectId: String(row.project_id ?? ""),
    sessionFile: String(row.session_file ?? ""),
  };
}

export function createWorkspaceRepository(db: Database): WorkspaceRepository {
  return {
    async create(workspace) {
      await db.client.execute({
        sql: `INSERT INTO workspaces (id, project_id, name, cwd, session_file, preset_id, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          workspace.id,
          workspace.projectId,
          workspace.name,
          workspace.cwd,
          workspace.sessionFile,
          workspace.presetId,
          workspace.createdAt,
        ],
      });

      return workspace;
    },
    async getById(workspaceId) {
      const result = await db.client.execute({
        sql: `SELECT id, project_id, name, cwd, session_file, preset_id, created_at
              FROM workspaces
              WHERE id = ?
              LIMIT 1`,
        args: [workspaceId],
      });

      const row = result.rows[0] as Record<string, unknown> | undefined;
      return row ? mapWorkspaceRow(row) : null;
    },
    async listByProject(projectId) {
      const result = await db.client.execute({
        sql: `SELECT id, project_id, name, cwd, session_file, preset_id, created_at
              FROM workspaces
              WHERE project_id = ?
              ORDER BY created_at DESC`,
        args: [projectId],
      });

      return result.rows.map((row) => mapWorkspaceRow(row as Record<string, unknown>));
    },
    async updateSessionFile(workspaceId, sessionFile) {
      await db.client.execute({
        sql: "UPDATE workspaces SET session_file = ? WHERE id = ?",
        args: [sessionFile, workspaceId],
      });

      const workspace = await this.getById(workspaceId);
      if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }

      return workspace;
    },
    async delete(workspaceId) {
      const workspace = await this.getById(workspaceId);
      if (!workspace) return undefined;
      
      await db.client.execute({
        sql: "DELETE FROM workspaces WHERE id = ?",
        args: [workspaceId],
      });
      return workspace;
    },
  } satisfies WorkspaceRepository;
}
