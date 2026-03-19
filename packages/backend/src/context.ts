import fs from "node:fs";
import { getAppRootDir, getSessionsDir } from "@kiracode/config";
import { createDbClient } from "@kiracode/db";
import { createRuntimeManager } from "@kiracode/session-runtime";
import { createProjectService } from "./services/project-service.ts";
import { createWorkspaceService } from "./services/workspace-service.ts";

export type AppContext = ReturnType<typeof createAppContext>;

export function createAppContext() {
  const appRootDir = getAppRootDir();
  const sessionsDir = getSessionsDir();

  fs.mkdirSync(appRootDir, { recursive: true });
  fs.mkdirSync(sessionsDir, { recursive: true });

  const db = createDbClient();
  const runtimeManager = createRuntimeManager(sessionsDir);
  const projectService = createProjectService(db);
  const workspaceService = createWorkspaceService(db, runtimeManager);

  return {
    appRootDir,
    db,
    projectService,
    runtimeManager,
    sessionsDir,
    workspaceService,
  };
}
