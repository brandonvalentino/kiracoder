import { createHTTPServer } from "@trpc/server/adapters/standalone";
import type { Server } from "node:http";
import { createAppContext } from "./context.ts";
import { appRouter } from "./routers/index.ts";

export function createBackendServer() {
  const context = createAppContext();
  const httpServer = createHTTPServer({
    createContext() {
      return context;
    },
    router: appRouter,
  });

  return {
    name: "kiracode-backend",
    status: "ready",
    async start(port = 0) {
      await new Promise<void>((resolve) => {
        httpServer.listen(port, "127.0.0.1", () => resolve());
      });

      const address = httpServer.address();
      if (!address || typeof address === "string") {
        throw new Error("Failed to resolve backend server address");
      }

      return {
        port: address.port,
        url: `http://127.0.0.1:${address.port}`,
      };
    },
    async stop() {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      context.runtimeManager.disposeAll();
    },
    httpServer: httpServer as Server,
  };
}
