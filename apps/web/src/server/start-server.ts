import { createBackendServer } from "@kiracode/backend";

export async function startServer() {
  const server = createBackendServer();
  const address = await server.start();

  return {
    address,
    server,
  };
}
