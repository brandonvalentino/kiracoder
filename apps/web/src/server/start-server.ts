import { createAppContext, createBackendServer } from "@kiracode/backend";

export function startServer() {
  const context = createAppContext();
  const server = createBackendServer();

  return {
    context,
    server,
  };
}
