import {
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
  SettingsManager,
  type AgentSession,
} from "@mariozechner/pi-coding-agent";
import { getPiAgentDir, resolveAuthPath } from "@kiracode/config";

export type WorkspaceRuntimeRecord = {
  workspaceId: string;
  session: AgentSession;
  sessionId: string;
  sessionFile: string;
  status: "idle";
  cwd: string;
};

function createSessionDependencies(cwd: string) {
  const authStorage = AuthStorage.create(resolveAuthPath());
  const modelRegistry = new ModelRegistry(authStorage);
  const settingsManager = SettingsManager.create(cwd, getPiAgentDir());

  return {
    authStorage,
    modelRegistry,
    settingsManager,
  };
}

export async function createWorkspaceSession(
  workspaceId: string,
  cwd: string,
  sessionsDir: string,
) {
  const { authStorage, modelRegistry, settingsManager } = createSessionDependencies(cwd);
  const sessionManager = SessionManager.create(cwd, sessionsDir);
  const { session } = await createAgentSession({
    agentDir: getPiAgentDir(),
    authStorage,
    cwd,
    modelRegistry,
    sessionManager,
    settingsManager,
  });

  if (!session.sessionFile) {
    throw new Error("Agent session did not produce a session file");
  }

  return {
    workspaceId,
    session,
    sessionId: session.sessionId,
    sessionFile: session.sessionFile,
    status: "idle",
    cwd,
  } satisfies WorkspaceRuntimeRecord;
}

export async function openWorkspaceSession(
  workspaceId: string,
  cwd: string,
  sessionFile: string,
  sessionsDir: string,
) {
  const { authStorage, modelRegistry, settingsManager } = createSessionDependencies(cwd);
  const sessionManager = SessionManager.open(sessionFile, sessionsDir);
  const { session } = await createAgentSession({
    agentDir: getPiAgentDir(),
    authStorage,
    cwd,
    modelRegistry,
    sessionManager,
    settingsManager,
  });

  if (!session.sessionFile) {
    throw new Error("Agent session did not restore a session file");
  }

  return {
    workspaceId,
    session,
    sessionId: session.sessionId,
    sessionFile: session.sessionFile,
    status: "idle",
    cwd,
  } satisfies WorkspaceRuntimeRecord;
}
