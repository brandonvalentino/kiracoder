/**
 * HTTP Policy / CORS
 *
 * Encapsulates local request policy for a packaged local app.
 * Allows any localhost / 127.0.0.1 origin and denies other cross-origin
 * requests by omitting CORS allow headers.
 */

import type { Hono } from "hono";

const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function mountHttpPolicy(app: Hono) {
  app.use("*", async (c, next) => {
    const origin = c.req.header("Origin") ?? "";
    const allowedOrigin = localhostOriginPattern.test(origin) ? origin : null;

    if (c.req.method === "OPTIONS") {
      const headers = new Headers();

      if (allowedOrigin) {
        headers.set("Access-Control-Allow-Origin", allowedOrigin);
        headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type, trpc-batch-mode");
        headers.set("Access-Control-Allow-Credentials", "true");
      }

      return new Response(null, {
        status: 204,
        headers,
      });
    }

    await next();

    if (!allowedOrigin) {
      return;
    }

    c.res.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    c.res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    c.res.headers.set("Access-Control-Allow-Headers", "Content-Type, trpc-batch-mode");
    c.res.headers.set("Access-Control-Allow-Credentials", "true");
  });
}
