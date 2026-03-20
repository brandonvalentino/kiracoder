/**
 * Frontend Asset Delivery
 *
 * Serves the built frontend, handles missing-build response, static assets,
 * SPA fallback routing, and non-GET/HEAD rejections for non-tRPC routes.
 */

import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import type { Hono } from "hono";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const frontendDistDir = path.resolve(__dirname, "../../../frontend/dist");

const mimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

export type FrontendMountOptions = {
  distDir?: string;
};

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

function createStreamResponse(filePath: string) {
  const ext = path.extname(filePath);
  const stream = Readable.toWeb(createReadStream(filePath)) as unknown as ReadableStream;

  return new Response(stream, {
    headers: {
      "Content-Type": mimeTypes[ext] ?? "application/octet-stream",
    },
  });
}

function isWithinDir(filePath: string, dirPath: string) {
  return filePath === dirPath || filePath.startsWith(`${dirPath}${path.sep}`);
}

export function mountFrontend(app: Hono, options: FrontendMountOptions = {}) {
  const distDir = path.resolve(options.distDir ?? frontendDistDir);

  app.all("*", (c) => {
    if (c.req.method !== "GET" && c.req.method !== "HEAD") {
      return c.text("Method Not Allowed", 405);
    }

    if (!existsSync(distDir)) {
      return c.html(frontendBuildMissingHtml(), 200);
    }

    const requestPath = new URL(c.req.url).pathname;
    const safePath = requestPath === "/" ? "/index.html" : requestPath;
    const filePath = path.resolve(distDir, `.${safePath}`);

    if (!isWithinDir(filePath, distDir)) {
      return c.text("Forbidden", 403);
    }

    if (existsSync(filePath) && statSync(filePath).isFile()) {
      if (c.req.method === "HEAD") {
        const ext = path.extname(filePath);
        return new Response(null, {
          headers: {
            "Content-Type": mimeTypes[ext] ?? "application/octet-stream",
          },
        });
      }
      return createStreamResponse(filePath);
    }

    const indexPath = path.join(distDir, "index.html");
    if (!existsSync(indexPath)) {
      return c.html(frontendBuildMissingHtml(), 200);
    }

    if (c.req.method === "HEAD") {
      return new Response(null, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    return new Response(readFileSync(indexPath), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  });
}
