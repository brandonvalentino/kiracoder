import { startServer } from "../server/start-server.ts";

export function runCli() {
  const runtime = startServer();
  const message = `Started ${runtime.server.name} (${runtime.server.status})`;
  console.log(message);
  return message;
}
