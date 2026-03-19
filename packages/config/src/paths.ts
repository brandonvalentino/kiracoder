import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

const appRootDir = path.join(homedir(), ".kiracode");
const piAgentDir = path.join(homedir(), ".pi", "agent");

export function getAppRootDir() {
  return appRootDir;
}

export function getPiAgentDir() {
  return piAgentDir;
}

export function getSessionsDir() {
  return path.join(appRootDir, "sessions");
}

export function getDatabasePath() {
  return path.join(appRootDir, "app.db");
}

export function getSettingsPath() {
  return path.join(appRootDir, "settings.json");
}

export function getAuthPath() {
  return path.join(appRootDir, "auth.json");
}

export function resolveAuthPath() {
  const appAuthPath = getAuthPath();
  if (fs.existsSync(appAuthPath)) {
    return appAuthPath;
  }

  return path.join(getPiAgentDir(), "auth.json");
}
