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

export async function createWorkspaceSession(
  workspaceId: string,
  cwd: string,
  sessionsDir: string,
) {
  const authStorage = AuthStorage.create(resolveAuthPath());
  const modelRegistry = new ModelRegistry(authStorage);
  const settingsManager = SettingsManager.create(cwd, getPiAgentDir());
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
