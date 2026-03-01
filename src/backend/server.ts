/**
 * Express Server - Serves static files and handles WebSocket connections
 */

import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import readline from "readline";
import { RPCManager } from "./rpc-manager";
import { WebSocketHandler } from "./websocket-handler";
import memorydRoutes from "./memoryd-routes";

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

const SESSIONS_DIR = path.join(
  process.env.HOME || "~",
  ".pi/agent/sessions"
);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../public")));

// Initialize RPC Manager (starts with no session — ephemeral)
const rpcManager = new RPCManager({
  piCommand: "pi",
  args: ["--mode", "rpc", "--no-session"],
  onStderr: (line) => {
    console.error(`[Pi] ${line}`);
  },
});

// Initialize WebSocket Handler
const wsHandler = new WebSocketHandler(rpcManager);

// Handle WebSocket upgrades
server.on("upgrade", (request, socket, head) => {
  if (request.url === "/ws") {
    wsHandler.handleUpgrade(request, socket, head);
  } else {
    socket.destroy();
  }
});

// Memoryd API routes
app.use("/api/memoryd", memorydRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    rpcRunning: rpcManager.running,
  });
});

/**
 * List all sessions, grouped by project directory.
 * Returns: { projects: [{ path, dirName, sessions: [{ id, file, timestamp, name, firstMessage, cwd }] }] }
 */
app.get("/api/sessions", async (req, res) => {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) {
      return res.json({ projects: [] });
    }

    const dirEntries = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true });
    const projects: Array<{
      path: string;
      dirName: string;
      sessions: Array<{
        id: string;
        file: string;
        filePath: string;
        timestamp: string;
        name: string | null;
        firstMessage: string | null;
        cwd: string | null;
      }>;
    }> = [];

    for (const dir of dirEntries) {
      if (!dir.isDirectory()) continue;

      const projectDir = path.join(SESSIONS_DIR, dir.name);
      const files = fs.readdirSync(projectDir).filter((f) => f.endsWith(".jsonl"));

      // Decode directory name back to path: --Users-mattkennelly-- → /Users/mattkennelly
      const decodedPath = dir.name.replace(/^--/, "/").replace(/--$/, "").replace(/-/g, "/");

      const sessions: typeof projects[0]["sessions"] = [];

      for (const file of files) {
        try {
          const filePath = path.join(projectDir, file);
          const parsed = await parseSessionFile(filePath);
          if (parsed) {
            sessions.push({
              ...parsed,
              file,
              filePath,
            });
          }
        } catch {
          // Skip unparseable sessions
        }
      }

      // Sort sessions by timestamp descending (newest first)
      sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      if (sessions.length > 0) {
        projects.push({
          path: decodedPath,
          dirName: dir.name,
          sessions,
        });
      }
    }

    // Sort projects by most recent session
    projects.sort((a, b) => {
      const aTime = a.sessions[0]?.timestamp || "";
      const bTime = b.sessions[0]?.timestamp || "";
      return bTime.localeCompare(aTime);
    });

    res.json({ projects });
  } catch (error) {
    console.error("[API] Error listing sessions:", error);
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

/**
 * Get full session history for rendering in the chat
 */
app.get("/api/sessions/:dirName/:file", async (req, res) => {
  try {
    const { dirName, file } = req.params;
    const filePath = path.join(SESSIONS_DIR, dirName, file);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Session not found" });
    }

    const entries: unknown[] = [];
    const stream = fs.createReadStream(filePath, { encoding: "utf8" });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (line.trim()) {
        try {
          entries.push(JSON.parse(line));
        } catch {
          // skip
        }
      }
    }

    res.json({ entries });
  } catch (error) {
    console.error("[API] Error reading session:", error);
    res.status(500).json({ error: "Failed to read session" });
  }
});

/**
 * Switch Pi to a different session (or start a new one)
 */
app.post("/api/sessions/switch", (req, res) => {
  const { sessionFile } = req.body;

  try {
    rpcManager.stop();

    if (sessionFile) {
      // Resume existing session
      console.log(`[Server] Switching to session: ${sessionFile}`);
      rpcManager.updateArgs(["--mode", "rpc", "--session", sessionFile]);
    } else {
      // New ephemeral session
      console.log("[Server] Starting new session");
      rpcManager.updateArgs(["--mode", "rpc", "--no-session"]);
    }

    rpcManager.start();
    wsHandler.notifySessionSwitch();

    res.json({ success: true });
  } catch (error) {
    console.error("[Server] Failed to switch session:", error);
    res.status(500).json({ error: "Failed to switch session" });
  }
});

/**
 * Parse the first few lines of a session JSONL to extract metadata
 */
async function parseSessionFile(
  filePath: string
): Promise<{
  id: string;
  timestamp: string;
  name: string | null;
  firstMessage: string | null;
  cwd: string | null;
} | null> {
  const stream = fs.createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let header: { id?: string; timestamp?: string; cwd?: string } | null = null;
  let firstMessage: string | null = null;
  let sessionName: string | null = null;
  let lineCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    lineCount++;

    try {
      const entry = JSON.parse(line);

      if (entry.type === "session") {
        header = entry;
      } else if (entry.type === "session_info" && entry.name) {
        sessionName = entry.name;
      } else if (
        entry.type === "message" &&
        entry.message?.role === "user" &&
        !firstMessage
      ) {
        const content = entry.message.content;
        if (typeof content === "string") {
          firstMessage = content.substring(0, 120);
        } else if (Array.isArray(content)) {
          const textBlock = content.find(
            (b: { type: string }) => b.type === "text"
          );
          if (textBlock) {
            firstMessage = textBlock.text.substring(0, 120);
          }
        }
      }
    } catch {
      // skip
    }

    // Read enough lines to find the first user message + any session_info
    // but don't read the entire file
    if (lineCount > 50 && firstMessage) break;
  }

  rl.close();
  stream.destroy();

  if (!header?.id) return null;

  return {
    id: header.id,
    timestamp: header.timestamp || "",
    name: sessionName,
    firstMessage,
    cwd: header.cwd || null,
  };
}

// Start server
server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🚀 Pi Web UI Server`);
  console.log(`========================================`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`========================================\n`);

  // Start Pi RPC process
  try {
    rpcManager.start();
    console.log("✅ Pi RPC process started\n");
  } catch (error) {
    console.error("❌ Failed to start Pi RPC process:", error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down...");
  rpcManager.stop();
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down...");
  rpcManager.stop();
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});
