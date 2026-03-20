/**
 * Server Lifecycle
 *
 * Owns startup, shutdown, and runtime cleanup for the backend.
 * Preserves the external startup contract: { url, apiUrl, port }.
 *
 * The Hono application is assembled by createHonoApp; this module only
 * handles binding it to a Node HTTP server and managing lifecycle.
 */

import { serve } from "@hono/node-server";
import type { Server } from "node:http";
import { createAppContext, type AppContext } from "./context.ts";
import { createHonoApp, type BackendAppOptions } from "./http/app.ts";
import { TRPC_BASE_PATH } from "./http/trpc-mount.ts";

export type BackendServerOptions = BackendAppOptions & {
  context?: AppContext;
};

export function createBackendApp(context: AppContext, options: BackendAppOptions = {}) {
  return createHonoApp(context, options);
}

export function createBackendServer(options: BackendServerOptions = {}) {
  const { context = createAppContext(), ...appOptions } = options;
  const honoApp = createBackendApp(context, appOptions);

  let httpServer: Server | null = null;

  return {
    name: "kiracode-backend",
    status: "ready",

    /** Start the server on the given port (default 0 = OS-assigned). */
    async start(port = 0) {
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

    /** Stop the server and dispose all open runtimes. */
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
      await Promise.resolve(context.runtimeManager.disposeAll());
    },

    /** Exposed for test introspection; prefer start/stop for lifecycle. */
    get httpServer(): Server | null {
      return httpServer;
    },
  };
}
