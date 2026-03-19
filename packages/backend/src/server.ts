import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import fs from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAppContext } from "./context.ts";
import { appRouter } from "./routers/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDistDir = path.resolve(__dirname, "../../frontend/dist");
const trpcBasePath = "/trpc/";

const mimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

/**
 * CORS headers for local development.
 * The app only listens on 127.0.0.1 so we allow any localhost origin —
 * this is safe for a local-only app and lets `npm run dev:full` work
 * with the frontend on :5173 and backend on :3141.
 */
function setCorsHeaders(req: IncomingMessage, res: ServerResponse<IncomingMessage>) {
  const origin = req.headers.origin ?? "";
  // Allow any localhost / 127.0.0.1 origin (any port)
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, trpc-batch-mode");
  res.setHeader("Access-Control-Allow-Credentials", "true");
}

function frontendBuildMissingPage() {
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

function serveStaticAsset(requestPath: string, res: ServerResponse<IncomingMessage>) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.join(frontendDistDir, safePath.replace(/^\//, ""));

  if (!filePath.startsWith(frontendDistDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return true;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
    });
    fs.createReadStream(filePath).pipe(res);
    return true;
  }

  return false;
}

export function createBackendServer() {
  const context = createAppContext();
  const trpcHandler = createHTTPHandler({
    basePath: trpcBasePath,
    createContext() {
      return context;
    },
    router: appRouter,
  });

  const httpServer = createServer((req, res) => {
    const requestUrl = new URL(req.url || "/", "http://127.0.0.1");

    // Handle CORS preflight for all routes
    if (req.method === "OPTIONS") {
      setCorsHeaders(req, res);
      res.writeHead(204);
      res.end();
      return;
    }

    if (`${requestUrl.pathname}/`.startsWith(trpcBasePath)) {
      setCorsHeaders(req, res);
      trpcHandler(req, res);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end("Method Not Allowed");
      return;
    }

    if (!fs.existsSync(frontendDistDir)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(frontendBuildMissingPage());
      return;
    }

    if (serveStaticAsset(requestUrl.pathname, res)) {
      return;
    }

    const indexPath = path.join(frontendDistDir, "index.html");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    fs.createReadStream(indexPath).pipe(res);
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
        apiUrl: `http://127.0.0.1:${address.port}${trpcBasePath}`,
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
