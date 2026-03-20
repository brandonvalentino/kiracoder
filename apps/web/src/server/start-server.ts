import { createBackendServer } from "@kiracode/backend";
import { env } from "./env.ts";

export async function startServer() {
  const server = createBackendServer();
  const address = await server.start(env.KIRACODE_PORT);

  return {
    address,
    server,
  };
}
