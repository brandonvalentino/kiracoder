import { createApiClient } from "./api-client.ts";
import { startServer } from "../server/start-server.ts";

export async function runCli() {
  const runtime = await startServer();
  const client = createApiClient(runtime.address.url);

  try {
    const health = await client.system.health.query();
    const project = await client.projects.create.mutate({
      name: "Local Project",
    });
    const workspaceResult = await client.workspaces.create.mutate({
      cwd: process.env.KIRACODE_FOLDER,
      name: "Main Workspace",
      projectId: project.id,
    });

    const message = [
      `Started ${runtime.server.name} (${runtime.server.status})`,
      `API: ${runtime.address.url}`,
      `Health: ${health.status}`,
      `Project: ${project.name}`,
      `Workspace: ${workspaceResult.workspace.name}`,
      `Folder: ${workspaceResult.workspace.cwd}`,
      `Session: ${workspaceResult.runtime.sessionFile}`,
    ].join("\n");

    console.log(message);
    return message;
  } finally {
    await runtime.server.stop();
  }
}
