#!/usr/bin/env node
/**
 * 🏛️ MemPalace Session Start — v3.2.0
 * Genererer session_id og skriver session-fil.
 * Ingen stdout — kun strukturert logging til JSONL.
 */

import { writeFileSync, appendFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const SESSION_FILE = "/tmp/kimi_session.json";
const LOG_PATH = resolve(root, ".kimi/logs/mempalace.jsonl");

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
    /* ignore — logging must not break startup */
  }
}

const sessionId = crypto.randomUUID();
const startedAt = Date.now();
const pid = process.pid;

const sessionData = {
  session_id: sessionId,
  started_at: startedAt,
  pid,
};

try {
  writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2), "utf8");
} catch (e) {
  writeLog({
    ts: nowISO(),
    phase: "start",
    session_id: sessionId,
    pid,
    status: "error",
    error: `failed_to_write_session_file: ${e.message}`,
  });
  process.exit(1);
}

writeLog({
  ts: nowISO(),
  phase: "start",
  session_id: sessionId,
  pid,
  status: "ok",
});

process.exit(0);
