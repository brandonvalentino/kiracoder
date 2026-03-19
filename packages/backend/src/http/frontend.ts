/**
 * Frontend Asset Delivery
 *
 * Serves the built frontend, handles missing-build response, static assets,
 * and SPA fallback routing through Hono.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const frontendDistDir = path.resolve(__dirname, "../../../frontend/dist");

function frontendBuildMissingHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KiraCode</title>
    <style>
      body { background:#111; color:#f5f5f5; font-family:Inter,system-ui,sans-serif; padding:40px; }
      code { background:#1f1f1f; padding:2px 6px; border-radius:8px; }
    </style>
  </head>
  <body>
    <h1>KiraCode frontend not built</h1>
    <p>Run <code>npm run build -w @kiracode/frontend</code> and reload this page.</p>
  </body>
</html>`;
}

export function mountFrontend(app: Hono) {
  // If the dist directory doesn't exist, show missing-build page for all GETs.
  app.get("*", async (c, next) => {
    if (!fs.existsSync(frontendDistDir)) {
      return c.html(frontendBuildMissingHtml(), 200);
    }
    return next();
  });

  // Serve static files from frontend dist directory.
  app.use("/*", serveStatic({ root: frontendDistDir }));

  // SPA fallback: serve index.html for any unmatched GET route.
  app.get("*", (c) => {
    const indexPath = path.join(frontendDistDir, "index.html");
    if (!fs.existsSync(indexPath)) {
      return c.html(frontendBuildMissingHtml(), 200);
    }
    const html = fs.readFileSync(indexPath, "utf-8");
    return c.html(html, 200);
  });
}
