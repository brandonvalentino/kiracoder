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
    const initialMessages = await client.workspaces.messages.query({
      workspaceId: workspaceResult.workspace.id,
    });

    const lines = [
      `Started ${runtime.server.name} (${runtime.server.status})`,
      `API: ${runtime.address.url}`,
      `Health: ${health.status}`,
      `Project: ${project.name}`,
      `Workspace: ${workspaceResult.workspace.name}`,
      `Folder: ${workspaceResult.workspace.cwd}`,
      `Session: ${workspaceResult.runtime.sessionFile}`,
      `Messages: ${initialMessages.length}`,
    ];

    const prompt = process.env.KIRACODE_PROMPT;
    if (prompt) {
      const receivedEventTypes: string[] = [];
      const subscription = client.workspaces.events.subscribe(
        { workspaceId: workspaceResult.workspace.id },
        {
          onData(data) {
            const event = data.event as { type?: string };
            receivedEventTypes.push(event.type ?? "unknown");
          },
        },
      );

      await client.workspaces.prompt.mutate({
        message: prompt,
        workspaceId: workspaceResult.workspace.id,
      });

      subscription.unsubscribe();
      const nextMessages = await client.workspaces.messages.query({
        workspaceId: workspaceResult.workspace.id,
      });
      lines.push(`Prompted: yes`);
      lines.push(`Events: ${receivedEventTypes.join(", ") || "none"}`);
      lines.push(`Messages after prompt: ${nextMessages.length}`);
    }

    const message = lines.join("\n");
    console.log(message);
    return message;
  } finally {
    await runtime.server.stop();
  }
}
