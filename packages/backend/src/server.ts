import { serve } from "@hono/node-server";
import type { Server } from "node:http";
import { createAppContext, type AppContext } from "./context.ts";
import { createHonoApp, type BackendAppOptions } from "./http/app.ts";
import { TRPC_BASE_PATH } from "./http/trpc-mount.ts";

export type BackendServerOptions = BackendAppOptions & {
  context?: AppContext | Promise<AppContext>;
};

export function createBackendApp(context: AppContext, options: BackendAppOptions = {}) {
  return createHonoApp(context, options);
}

export function createBackendServer(options: BackendServerOptions = {}) {
  const { context, ...appOptions } = options;
  const contextPromise = Promise.resolve(context ?? createAppContext());

  let appContext: AppContext | null = null;
  let httpServer: Server | null = null;

  return {
    name: "kiracode-backend",
    status: "ready",

    async start(port = 0) {
      appContext = await contextPromise;
      const honoApp = createBackendApp(appContext, appOptions);

      await new Promise<void>((resolve) => {
        httpServer = serve(
          {
            fetch: honoApp.fetch,
            hostname: "127.0.0.1",
            port,
          },
          () => resolve(),
        ) as unknown as Server;
      });

      const address = httpServer!.address();
      if (!address || typeof address === "string") {
        throw new Error("Failed to resolve backend server address");
      }

      return {
        apiUrl: `http://127.0.0.1:${address.port}${TRPC_BASE_PATH}/`,
        port: address.port,
        url: `http://127.0.0.1:${address.port}`,
      };
    },

    async stop() {
      await new Promise<void>((resolve, reject) => {
        if (!httpServer) {
          resolve();
          return;
        }
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      await Promise.resolve(appContext?.runtimeManager.disposeAll());
      appContext?.db.close();
    },

    get httpServer(): Server | null {
      return httpServer;
    },
  };
}
