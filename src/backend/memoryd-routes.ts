/**
 * Memoryd API routes — exposes memory files, session cards, and daemon controls.
 */

import { Router } from "express";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";

const router = Router();

const HOME = process.env.HOME || "~";
const MEMORYD_DIR = path.join(HOME, "memoryd");
const MEMORY_DIR = path.join(MEMORYD_DIR, "memory");
const SEEDS_DIR = path.join(MEMORY_DIR, "seeds");
const WORKING_DIR = path.join(MEMORY_DIR, "working");
const SESSION_CARDS_DIR = path.join(MEMORYD_DIR, "data/session-cards");
const LOG_FILE = path.join(MEMORYD_DIR, "logs/daemon.log");
const DB_PATH = path.join(MEMORYD_DIR, "data/memory.db");

// ─── Memory Files (semantic, episodic) ───

router.get("/memory/:file", (req, res) => {
  const allowed = ["semantic.md", "episodic.md"];
  const file = req.params.file;
  if (!allowed.includes(file)) {
    return res.status(400).json({ error: "Invalid memory file" });
  }
  const filePath = path.join(MEMORY_DIR, file);
  if (!fs.existsSync(filePath)) {
    return res.json({ content: "", exists: false });
  }
  const content = fs.readFileSync(filePath, "utf8");
  const stat = fs.statSync(filePath);
  res.json({ content, exists: true, modified: stat.mtime.toISOString(), size: stat.size });
});

router.put("/memory/:file", (req, res) => {
  const allowed = ["semantic.md", "episodic.md"];
  const file = req.params.file;
  if (!allowed.includes(file)) {
    return res.status(400).json({ error: "Invalid memory file" });
  }
  const filePath = path.join(MEMORY_DIR, file);
  try {
    fs.writeFileSync(filePath, req.body.content, "utf8");
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Seed Files ───

router.get("/seeds", (req, res) => {
  if (!fs.existsSync(SEEDS_DIR)) {
    return res.json({ files: [] });
  }
  const files = fs.readdirSync(SEEDS_DIR)
    .filter(f => f.endsWith(".md"))
    .map(f => {
      const stat = fs.statSync(path.join(SEEDS_DIR, f));
      return { name: f, modified: stat.mtime.toISOString(), size: stat.size };
    });
  res.json({ files });
});

router.get("/seeds/:file", (req, res) => {
  const file = req.params.file;
  if (!file.endsWith(".md")) {
    return res.status(400).json({ error: "Invalid seed file" });
  }
  const filePath = path.join(SEEDS_DIR, file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Not found" });
  }
  const content = fs.readFileSync(filePath, "utf8");
  const stat = fs.statSync(filePath);
  res.json({ content, modified: stat.mtime.toISOString(), size: stat.size });
});

router.put("/seeds/:file", (req, res) => {
  const file = req.params.file;
  if (!file.endsWith(".md")) {
    return res.status(400).json({ error: "Invalid seed file" });
  }
  const filePath = path.join(SEEDS_DIR, file);
  try {
    fs.mkdirSync(SEEDS_DIR, { recursive: true });
    fs.writeFileSync(filePath, req.body.content, "utf8");
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Working Memory ───

router.get("/working", (req, res) => {
  if (!fs.existsSync(WORKING_DIR)) {
    return res.json({ files: [] });
  }
  const files = fs.readdirSync(WORKING_DIR)
    .filter(f => f.endsWith(".md"))
    .map(f => {
      const stat = fs.statSync(path.join(WORKING_DIR, f));
      return { name: f, modified: stat.mtime.toISOString(), size: stat.size };
    })
    .sort((a, b) => b.modified.localeCompare(a.modified));
  res.json({ files });
});

router.get("/working/:file", (req, res) => {
  const file = req.params.file;
  const filePath = path.join(WORKING_DIR, file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Not found" });
  }
  const content = fs.readFileSync(filePath, "utf8");
  const stat = fs.statSync(filePath);
  res.json({ content, modified: stat.mtime.toISOString(), size: stat.size });
});

// ─── Session Cards ───

router.get("/cards", (req, res) => {
  if (!fs.existsSync(SESSION_CARDS_DIR)) {
    return res.json({ cards: [], total: 0 });
  }
  const allFiles = fs.readdirSync(SESSION_CARDS_DIR)
    .filter(f => f.endsWith(".md"))
    .map(f => {
      const stat = fs.statSync(path.join(SESSION_CARDS_DIR, f));
      // Extract title from filename: hash_Title.md
      const match = f.match(/^[a-f0-9]+_(.+)\.md$/);
      const title = match ? match[1].replace(/-/g, " ") : f;
      // Extract date from card content for sorting
      const sessionDate = extractCardDate(path.join(SESSION_CARDS_DIR, f));
      return { name: f, title, modified: stat.mtime.toISOString(), size: stat.size, sessionDate };
    })
    .sort((a, b) => {
      // Sort by extracted session date (newest first), fall back to modified
      const aDate = a.sessionDate || a.modified;
      const bDate = b.sessionDate || b.modified;
      return bDate.localeCompare(aDate);
    });

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 30;
  const search = (req.query.search as string || "").toLowerCase();

  let filtered = allFiles;
  if (search) {
    filtered = allFiles.filter(f => f.title.toLowerCase().includes(search) || f.name.toLowerCase().includes(search));
  }

  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  res.json({ cards: paginated, total: filtered.length, page, limit });
});

router.get("/cards/:file", (req, res) => {
  const file = req.params.file;
  const filePath = path.join(SESSION_CARDS_DIR, file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Not found" });
  }
  const content = fs.readFileSync(filePath, "utf8");
  const stat = fs.statSync(filePath);
  res.json({ content, modified: stat.mtime.toISOString(), size: stat.size });
});

// ─── Daemon Logs ───

router.get("/logs", (req, res) => {
  const lines = parseInt(req.query.lines as string) || 100;
  if (!fs.existsSync(LOG_FILE)) {
    return res.json({ content: "(no log file)", exists: false });
  }
  try {
    const content = fs.readFileSync(LOG_FILE, "utf8");
    const allLines = content.split("\n");
    const tail = allLines.slice(-lines).join("\n");
    res.json({ content: tail, exists: true, totalLines: allLines.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Stats ───

router.get("/stats", (req, res) => {
  const stats: Record<string, any> = {};

  // Count session cards
  if (fs.existsSync(SESSION_CARDS_DIR)) {
    stats.sessionCards = fs.readdirSync(SESSION_CARDS_DIR).filter(f => f.endsWith(".md")).length;
  } else {
    stats.sessionCards = 0;
  }

  // Count working files
  if (fs.existsSync(WORKING_DIR)) {
    stats.workingFiles = fs.readdirSync(WORKING_DIR).filter(f => f.endsWith(".md")).length;
  } else {
    stats.workingFiles = 0;
  }

  // Memory file sizes
  for (const file of ["semantic.md", "episodic.md"]) {
    const fp = path.join(MEMORY_DIR, file);
    if (fs.existsSync(fp)) {
      const stat = fs.statSync(fp);
      stats[file.replace(".md", "")] = { size: stat.size, modified: stat.mtime.toISOString() };
    }
  }

  // Seed files
  if (fs.existsSync(SEEDS_DIR)) {
    stats.seeds = fs.readdirSync(SEEDS_DIR).filter(f => f.endsWith(".md")).map(f => f);
  } else {
    stats.seeds = [];
  }

  // DB size
  if (fs.existsSync(DB_PATH)) {
    stats.dbSize = fs.statSync(DB_PATH).size;
  }

  // Log file
  if (fs.existsSync(LOG_FILE)) {
    const stat = fs.statSync(LOG_FILE);
    stats.logLastModified = stat.mtime.toISOString();
  }

  res.json(stats);
});

// ─── Process Triggers ───

router.post("/run/:process", (req, res) => {
  const proc = req.params.process;
  const memorydBin = path.join(MEMORYD_DIR, "src/.build/xcode/Build/Products/Debug/memoryd");

  // Also check release build path
  const releaseBin = path.join(MEMORYD_DIR, "src/.build/release/memoryd");
  const bin = fs.existsSync(memorydBin) ? memorydBin : fs.existsSync(releaseBin) ? releaseBin : null;

  const validProcesses: Record<string, { command: string; args: string[]; description: string }> = {
    "index": {
      command: bin || "memoryd",
      args: ["index"],
      description: "Full re-index of all sources",
    },
    "index-incremental": {
      command: bin || "memoryd",
      args: ["index", "--incremental"],
      description: "Incremental index (new/changed files only)",
    },
    "stats": {
      command: bin || "memoryd",
      args: ["stats"],
      description: "Show index statistics",
    },
    "vacuum": {
      command: bin || "memoryd",
      args: ["vacuum"],
      description: "Clean orphaned embeddings and compact DB",
    },
    "generate-gists": {
      command: bin || "memoryd",
      args: ["generate-gists"],
      description: "Generate gist summaries for chunks",
    },
  };

  const config = validProcesses[proc];
  if (!config) {
    return res.status(400).json({ error: `Unknown process: ${proc}`, available: Object.keys(validProcesses) });
  }

  res.json({ started: true, process: proc, description: config.description });

  // Run async — client can poll logs to see output
  const child = execFile(config.command, config.args, { timeout: 600000 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`[memoryd:${proc}] Error:`, error.message);
    }
    if (stdout) console.log(`[memoryd:${proc}] ${stdout}`);
    if (stderr) console.error(`[memoryd:${proc}] ${stderr}`);
  });
});

// ─── Install Check ───

router.get("/check", (req, res) => {
  const exists = fs.existsSync(MEMORYD_DIR) && fs.existsSync(MEMORY_DIR);
  res.json({ installed: exists });
});

// ─── Helpers ───

/**
 * Extract a parseable date from the **Date:** line in a session card.
 * Returns ISO string or null.
 */
function extractCardDate(filePath: string): string | null {
  try {
    // Read just the first 1KB to find the Date line
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(1024);
    const bytesRead = fs.readSync(fd, buf, 0, 1024, 0);
    fs.closeSync(fd);
    const head = buf.toString("utf8", 0, bytesRead);

    const dateMatch = head.match(/\*\*Date:\*\*\s*(.+)/);
    if (!dateMatch) return null;

    const raw = dateMatch[1].trim();
    return parseLooseDate(raw);
  } catch {
    return null;
  }
}

/**
 * Parse various date formats into ISO strings for sorting.
 */
function parseLooseDate(raw: string): string | null {
  // Try direct ISO parse first: "2026-02-28"
  const isoMatch = raw.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1] + "T00:00:00Z";
  }

  // Try "Month DD, YYYY" or "DD Month YYYY"
  const months: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04",
    may: "05", june: "06", july: "07", august: "08",
    september: "09", october: "10", november: "11", december: "12",
  };

  const lower = raw.toLowerCase();

  // "February 28, 2026" or "February 28 2026"
  const mdyMatch = lower.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (mdyMatch) {
    const m = months[mdyMatch[1]];
    if (m) {
      const d = mdyMatch[2].padStart(2, "0");
      return `${mdyMatch[3]}-${m}-${d}T00:00:00Z`;
    }
  }

  // "28 February 2026"
  const dmyMatch = lower.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (dmyMatch) {
    const m = months[dmyMatch[2]];
    if (m) {
      const d = dmyMatch[1].padStart(2, "0");
      return `${dmyMatch[3]}-${m}-${d}T00:00:00Z`;
    }
  }

  // Just a year: try to find any 4-digit year as last resort
  const yearMatch = raw.match(/(20\d{2})/);
  if (yearMatch) {
    // Try to find a month
    for (const [name, num] of Object.entries(months)) {
      if (lower.includes(name)) {
        // Find a day number near the month
        const dayMatch = lower.match(new RegExp(`${name}\\s+(\\d{1,2})`)) ||
                          lower.match(new RegExp(`(\\d{1,2})\\s+${name}`));
        const d = dayMatch ? dayMatch[1].padStart(2, "0") : "15";
        return `${yearMatch[1]}-${num}-${d}T00:00:00Z`;
      }
    }
    return `${yearMatch[1]}-06-15T00:00:00Z`;
  }

  return null;
}

export default router;
