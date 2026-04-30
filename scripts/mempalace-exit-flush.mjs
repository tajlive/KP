#!/usr/bin/env node
/**
 * 🏛️ MemPalace Exit Flush — v3.2.0
 * Idempotent, session-bundet, verifiserende, structured-logging exit-save.
 *
 * Designprinsipper:
 * - Session-binding: leser /tmp/kimi_session.json for session_id + started_at
 * - Idempotens: /tmp/kimi_flush_done_<session_id> er atomic lock
 * - Verifisering: kg.json + diary.jsonl sjekkes for eksistens, størrelse, mtime, parsebarhet
 * - MCP-shutdown: SIGTERM til MemPalace MCP-prosess
 * - Logging: strukturert JSONL til .kimi/logs/mempalace.jsonl
 * - Defensiv: aldri kræsj; alltid logg; returnerer 0/1/2
 */

import {
  existsSync,
  statSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
} from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const SESSION_FILE = "/tmp/kimi_session.json";
const LOG_PATH = resolve(root, ".kimi/logs/mempalace.jsonl");
const KG_PATH = resolve(root, ".mempalace/kg.json");
const DIARY_PATH = resolve(root, ".kimi/diary.jsonl");

// ─── UTILS ───

function nowISO() {
  return new Date().toISOString();
}

function ensureDir(p) {
  try {
    mkdirSync(dirname(p), { recursive: true });
  } catch {
    /* ignore */
  }
}

function writeLog(entry) {
  ensureDir(LOG_PATH);
  try {
    appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    /* ignore */
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}kb`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
}

function formatAge(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

function findMempalacePids() {
  try {
    const output = execSync(
      "ps aux | grep -i mempalace | grep -v grep | grep -v 'exit-flush' | grep -v 'test-' | awk '{print $2}'",
      { encoding: "utf8", timeout: 1000 }
    );
    return output
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);
  } catch {
    return [];
  }
}

function sendSigtermToMcp() {
  const pids = findMempalacePids();
  let killed = false;
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
      killed = true;
    } catch {
      // ignore
    }
  }
  if (killed) {
    try {
      execSync("sleep 0.5", { timeout: 2000 });
    } catch {
      // ignore
    }
  }
  return { pids, killed };
}

function verifyFile(path, name, startedAt) {
  const out = {
    name,
    exists: false,
    size: 0,
    age_ms: null,
    valid: false,
    updated_this_session: false,
    error: null,
  };

  if (!existsSync(path)) {
    out.error = "not_found";
    return out;
  }
  out.exists = true;

  const stat = statSync(path);
  out.size = stat.size;
  out.age_ms = Date.now() - stat.mtimeMs;

  if (stat.size === 0) {
    out.error = "empty_file";
    return out;
  }

  if (startedAt && stat.mtimeMs > startedAt) {
    out.updated_this_session = true;
  }

  try {
    const data = readFileSync(path, "utf8");
    if (path.endsWith(".json")) {
      JSON.parse(data);
    } else if (path.endsWith(".jsonl")) {
      const lines = data.trim().split("\n").filter(Boolean);
      if (lines.length === 0) {
        out.error = "no_lines";
        return out;
      }
      // Verify last line is valid JSON
      JSON.parse(lines[lines.length - 1]);
    }
    out.valid = true;
  } catch (e) {
    out.error = `corrupt: ${e.message}`;
  }

  return out;
}

// ─── MAIN ───

const start = Date.now();
const pid = process.pid;

// a) Les session-fil
let session = null;
if (existsSync(SESSION_FILE)) {
  try {
    session = JSON.parse(readFileSync(SESSION_FILE, "utf8"));
  } catch (e) {
    session = null;
  }
}

const sessionId = session?.session_id || null;
const startedAt = session?.started_at || 0;

// b) IDEMPOTENS-guard
if (sessionId) {
  const doneMarker = `/tmp/kimi_flush_done_${sessionId}`;
  if (existsSync(doneMarker)) {
    writeLog({
      ts: nowISO(),
      phase: "exit",
      session_id: sessionId,
      pid,
      duration_ms: Date.now() - start,
      status: "ok",
      files: [],
      idempotent_skip: true,
    });
    console.log("🏛️  MemPalace Exit Flush — already flushed this session");
    process.exit(0);
  }
  try {
    writeFileSync(doneMarker, "", "utf8");
  } catch {
    // ignore — best effort
  }
}

// c) MemPalace MCP SIGTERM
const mcpStatus = sendSigtermToMcp();

// d) Verifisering
const files = [
  verifyFile(KG_PATH, "KG", startedAt),
  verifyFile(DIARY_PATH, "Diary", startedAt),
];

const allExist = files.every((f) => f.exists);
const allValid = files.every((f) => f.valid);
const allUpdated = files.every((f) => f.updated_this_session);

let status = "ok";
let error = null;

if (!session) {
  status = "degraded";
  error = "session_file_missing";
} else if (!allExist) {
  status = "failed";
  error = "missing_files";
} else if (!allValid) {
  status = "failed";
  error = "corrupt_files";
} else if (!allUpdated) {
  status = "failed";
  error = "files_not_updated_this_session";
}

const durationMs = Date.now() - start;

// e) Structured logging
writeLog({
  ts: nowISO(),
  phase: "exit",
  session_id: sessionId,
  pid,
  duration_ms: durationMs,
  status,
  files: files.map((f) => ({
    name: f.name,
    exists: f.exists,
    size: f.size,
    age_ms: f.age_ms,
    valid: f.valid,
    error: f.error,
  })),
  idempotent_skip: false,
  mcp_killed: mcpStatus.killed,
  mcp_pids: mcpStatus.pids,
});

// f) Human-readable output
const timeStr = new Date().toLocaleTimeString("no-NO", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

console.log("");
console.log(`🏛️  MemPalace Exit Flush — ${timeStr}`);
console.log("─────────────────────────────");
console.log(`  Session: ${sessionId || "unknown"}`);
console.log(`  MCP:     ${mcpStatus.killed ? "SIGTERM sent" : "not running"}`);

for (const f of files) {
  const icon = f.valid && f.updated_this_session ? "✅" : f.exists ? "⚠️" : "❌";
  const info = f.exists
    ? `${formatBytes(f.size)}, ${formatAge(f.age_ms)} old`
    : "not found";
  const extra = [];
  if (!f.updated_this_session && f.exists) extra.push("not updated this session");
  if (f.error) extra.push(f.error);
  const extraStr = extra.length ? ` | ${extra.join(", ")}` : "";
  console.log(`  ${f.name}:   ${icon} ${info}${extraStr}`);
}

console.log("──────────────────────────");

if (status === "ok") {
  console.log("✅ MemPalace safe — exiting");
} else if (status === "degraded") {
  console.log("⚠️  MemPalace degraded — session file missing, continuing");
} else {
  console.log("❌ MemPalace flush FAILED — check .kimi/logs/mempalace.jsonl");
}
console.log("");

// Returkoder
if (!session) process.exit(2);
if (status === "failed") process.exit(1);
process.exit(0);
