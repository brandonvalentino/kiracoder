/**
 * HTTP App Composer
 *
 * Assembles the Hono application with ordered middleware and route mounts.
 * Owns route ordering: HTTP policy → tRPC transport → frontend delivery.
 */

import { Hono } from "hono";
import { mountHttpPolicy } from "./policy.ts";
import { mountTrpc } from "./trpc-mount.ts";
import { mountFrontend } from "./frontend.ts";
import { appRouter } from "../routers/index.ts";
import type { AppContext } from "../context.ts";

export function createHonoApp(context: AppContext) {
  const app = new Hono();

  mountHttpPolicy(app);
  mountTrpc(app, appRouter, context);
  mountFrontend(app);

  return app;
}
