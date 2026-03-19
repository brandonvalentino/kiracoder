import { startServer } from "../server/start-server.ts";

export async function runCli() {
  const runtime = await startServer();
  console.log(`Started ${runtime.server.name} (${runtime.server.status})`);
  console.log(`App: ${runtime.address.url}`);
  console.log(`API: ${runtime.address.apiUrl}`);
  console.log("Press Ctrl+C to stop the local backend.");

  let shuttingDown = false;

  const shutdown = async () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    await runtime.server.stop();
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void shutdown();
  });
  process.once("SIGTERM", () => {
    void shutdown();
  });

  return runtime.address.url;
}
