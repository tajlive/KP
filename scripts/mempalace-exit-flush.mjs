#!/usr/bin/env node
/**
 * 🏛️ MemPalace Exit Flush — v3.2.0
 * Idempotent, verifiserende, structured-logging exit-save for MemPalace MCP.
 *
 * Designprinsipper:
 * - Idempotens: ACTIVE_SESSION er atomic lock; fjernes kun ved første vellykket flush
 * - Verifisering: kg.json + diary.jsonl sjekkes for eksistens, størrelse, mtime, parsebarhet
 * - Logging: strukturert JSONL til ~/.kimi/logs/mempalace.jsonl
 * - Defensiv: aldri kræsj; alltid logg; alltid returner 0
 */

import {
  existsSync,
  statSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
  unlinkSync,
} from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const KG_PATH = resolve(root, ".mempalace/kg.json");
const DIARY_PATH = resolve(root, ".kimi/diary.jsonl");
const ACTIVE_SESSION = resolve(process.env.HOME || "/Users/taj", ".kimi/ACTIVE_SESSION");
const LOG_PATH = resolve(process.env.HOME || "/Users/taj", ".kimi/logs/mempalace.jsonl");

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
    /* ignore — logging must not break flush */
  }
}

function parseSessionFile() {
  if (!existsSync(ACTIVE_SESSION)) return null;
  try {
    const raw = readFileSync(ACTIVE_SESSION, "utf8").trim();
    const lines = raw.split("\n");
    const result = {};
    for (const line of lines) {
      const [k, ...v] = line.split("=");
      if (k && v.length > 0) result[k.trim()] = v.join("=").trim();
    }
    return result.start_timestamp && result.session_id ? result : null;
  } catch {
    return null;
  }
}

function removeSessionFile() {
  try {
    if (existsSync(ACTIVE_SESSION)) unlinkSync(ACTIVE_SESSION);
    return true;
  } catch {
    return false;
  }
}

function verifyJsonFile(path, minSize = 2) {
  const out = {
    exists: false,
    size: 0,
    age_ms: null,
    parseable: false,
    entities: null,
    error: null,
  };
  if (!existsSync(path)) {
    out.error = "file_not_found";
    return out;
  }
  out.exists = true;
  const stat = statSync(path);
  out.size = stat.size;
  out.age_ms = Date.now() - stat.mtimeMs;
  if (stat.size < minSize) {
    out.error = "file_too_small";
    return out;
  }
  try {
    const data = readFileSync(path, "utf8");
    const parsed = JSON.parse(data);
    out.parseable = true;
    out.entities = Object.keys(parsed).length;
  } catch (e) {
    out.error = `parse_error: ${e.message}`;
  }
  return out;
}

function verifyJsonlFile(path, minSize = 2) {
  const out = {
    exists: false,
    size: 0,
    age_ms: null,
    parseable: false,
    lines: null,
    lastEntry: null,
    error: null,
  };
  if (!existsSync(path)) {
    out.error = "file_not_found";
    return out;
  }
  out.exists = true;
  const stat = statSync(path);
  out.size = stat.size;
  out.age_ms = Date.now() - stat.mtimeMs;
  if (stat.size < minSize) {
    out.error = "file_too_small";
    return out;
  }
  try {
    const data = readFileSync(path, "utf8").trim();
    const lines = data.split("\n").filter(Boolean);
    out.lines = lines.length;
    if (lines.length > 0) {
      out.lastEntry = JSON.parse(lines[lines.length - 1]);
      out.parseable = true;
    }
  } catch (e) {
    out.error = `parse_error: ${e.message}`;
  }
  return out;
}

// ─── MAIN ───

const start = Date.now();
const pid = process.pid;
const source = process.env.MEMPALACE_FLUSH_SOURCE || "unknown";

const session = parseSessionFile();

// Idempotens: ingen ACTIVE_SESSION = allerede flushed
if (!session) {
  const entry = {
    ts: nowISO(),
    phase: "exit",
    status: "noop",
    duration_ms: Date.now() - start,
    source,
    pid,
    session_id: null,
    file_state: null,
    error: "session_already_flushed_or_never_started",
  };
  writeLog(entry);
  console.log("🏛️  MemPalace Exit Flush — NOOP (session already flushed or never started)");
  process.exit(0);
}

const sessionId = session.session_id || "unknown";
const sessionStart = parseInt(session.start_timestamp, 10) || 0;

// Verifiser filer
const kg = verifyJsonFile(KG_PATH);
const diary = verifyJsonlFile(DIARY_PATH);

// Sjekk at filer er nyere enn session start
const kgNewerThanSession = kg.age_ms !== null && statSync(KG_PATH).mtimeMs >= sessionStart;
const diaryNewerThanSession = diary.age_ms !== null && statSync(DIARY_PATH).mtimeMs >= sessionStart;

// Bestem status
let status = "ok";
let error = null;
if (!kg.exists || !diary.exists) {
  status = "warn";
  error = `kg_exists=${kg.exists}, diary_exists=${diary.exists}`;
} else if (!kg.parseable || !diary.parseable) {
  status = "error";
  error = `kg_parseable=${kg.parseable}, diary_parseable=${diary.parseable}`;
} else if (!kgNewerThanSession && !diaryNewerThanSession) {
  status = "warn";
  error = "files_older_than_session_start";
}

// Fjern ACTIVE_SESSION (atomic unlock)
const removed = removeSessionFile();
if (!removed) {
  status = status === "ok" ? "warn" : status;
  error = error ? `${error}; failed_to_remove_active_session` : "failed_to_remove_active_session";
}

// Logg
const entry = {
  ts: nowISO(),
  phase: "exit",
  status,
  duration_ms: Date.now() - start,
  source,
  pid,
  session_id: sessionId,
  file_state: {
    kg_exists: kg.exists,
    kg_size: kg.size,
    kg_age_ms: kg.age_ms,
    kg_entities: kg.entities,
    kg_newer_than_session: kgNewerThanSession,
    diary_exists: diary.exists,
    diary_size: diary.size,
    diary_age_ms: diary.age_ms,
    diary_lines: diary.lines,
    diary_newer_than_session: diaryNewerThanSession,
  },
  error,
};
writeLog(entry);

// Console output
console.log("");
console.log("🏛️  MemPalace Exit Flush");
console.log(`   Session: ${sessionId}`);
console.log(`   Source:  ${source}`);
console.log(`   Status:  ${status}${error ? ` (${error})` : ""}`);
console.log("   ───────────────────────");
console.log(`   KG:      ${kg.exists ? "✅" : "❌"} ${kg.size.toLocaleString("no-NO")} bytes, ${kg.entities ?? "?"} entities${kg.age_ms !== null ? ` (${Math.round(kg.age_ms / 1000)}s old)` : ""}`);
console.log(`   Diary:   ${diary.exists ? "✅" : "❌"} ${diary.size.toLocaleString("no-NO")} bytes, ${diary.lines ?? "?"} lines${diary.age_ms !== null ? ` (${Math.round(diary.age_ms / 1000)}s old)` : ""}`);
console.log("");

process.exit(0);
