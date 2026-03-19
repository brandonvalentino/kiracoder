import { createBackendServer } from "@kiracode/backend";

export async function startServer() {
  const server = createBackendServer();
  const port = process.env.KIRACODE_PORT ? Number(process.env.KIRACODE_PORT) : 3141;
  const address = await server.start(port);

  return {
    address,
    server,
  };
}
