import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { createDatabase, createWorkspaceRepository, runMigrations } from "@kiracode/db";
import { getAppRootDir, getDatabasePath, getSessionsDir } from "@kiracode/config";
import { pickFolder } from "@kiracode/native";
import { createRuntimeManager } from "@kiracode/session-runtime";
import { createProjectService } from "./features/projects/index.ts";
import { createWorkspaceService } from "./features/workspaces/index.ts";

export type AppContext = Awaited<ReturnType<typeof createAppContext>>;

export async function createAppContext() {
  const appRootDir = getAppRootDir();
  const databasePath = getDatabasePath();
  const sessionsDir = getSessionsDir();

  fs.mkdirSync(appRootDir, { recursive: true });
  fs.mkdirSync(sessionsDir, { recursive: true });

  const db = createDatabase(databasePath);
  await runMigrations(db);

  const runtimeManager = createRuntimeManager(sessionsDir);
  const projectService = createProjectService({
    createId: randomUUID,
    db,
    now: () => new Date().toISOString(),
  });
  const workspaceService = createWorkspaceService({
    createId: randomUUID,
    now: () => new Date().toISOString(),
    pickFolder,
    repository: createWorkspaceRepository(db),
    runtimeManager,
    sessionsDir,
  });

  return {
    appRootDir,
    db,
    projectService,
    runtimeManager,
    sessionsDir,
    workspaceService,
  };
}
