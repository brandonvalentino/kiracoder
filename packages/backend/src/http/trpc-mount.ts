/**
 * tRPC Transport Mount
 *
 * Mounts the existing tRPC router into Hono at the preserved /trpc endpoint.
 * Preserves the external API contract — callers continue using the same
 * typed tRPC client at /trpc without required changes.
 */

import type { Hono } from "hono";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { AnyRouter } from "@trpc/server";
import type { AppContext } from "../context.ts";

export const TRPC_BASE_PATH = "/trpc";

export function mountTrpc(app: Hono, router: AnyRouter, context: AppContext) {
  const handler = (c: { req: { raw: Request } }) =>
    fetchRequestHandler({
      endpoint: TRPC_BASE_PATH,
      req: c.req.raw,
      router,
      createContext() {
        return context;
      },
    });

  app.all(`${TRPC_BASE_PATH}/*`, handler);
  app.all(TRPC_BASE_PATH, handler);
}
