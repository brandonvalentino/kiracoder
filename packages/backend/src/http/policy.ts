/**
 * HTTP Policy / CORS
 *
 * Encapsulates local request policy for a packaged local app.
 * Allows any localhost / 127.0.0.1 origin (safe for local-only app).
 */

import type { Hono } from "hono";
import { cors } from "hono/cors";

export function mountHttpPolicy(app: Hono) {
  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return origin;
        }
        return "*";
      },
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "trpc-batch-mode"],
      credentials: true,
    }),
  );
}
