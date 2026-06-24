#!/usr/bin/env node
/**
 * 🏛️ MemPalace Status — v3.4.0
 * Viser MemPalace-status ved KIMI-oppstart.
 * Skriver session-fil, viser KG/diary-stats, MCP-servere.
 * Logger til .kimi/logs/mempalace.jsonl med phase: "start".
 */

import { readFileSync, existsSync, statSync, writeFileSync, appendFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const kgPath = resolve(root, ".mempalace/kg.json");
const diaryPath = resolve(root, ".kimi/diary.jsonl");
const mcpConfigCandidates = [
  resolve(process.env.HOME || "/Users/taj", ".kimi-code/mcp.json"),
  resolve(process.env.HOME || "/Users/taj", ".kimi/mcp.json"),
];
const logPath = resolve(root, ".kimi/logs/mempalace.jsonl");
const sessionFile = "/tmp/kimi_session.json";

function formatDate(iso) {
  if (!iso) return "N/A";
  const d = new Date(iso);
  return d.toLocaleString("no-NO", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  ensureDir(logPath);
  try {
    appendFileSync(logPath, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    /* ignore */
  }
}

// ─── SESSION START (inline, samme logikk som mempalace-session-start.mjs) ───
const sessionId = crypto.randomUUID();
const startedAt = Date.now();
const pid = process.pid;

const sessionData = { session_id: sessionId, started_at: startedAt, pid };
try {
  writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2), "utf8");
} catch {
  // best effort
}

// ─── KG STATUS ───
let entityCount = 0;
let factCount = 0;
let kgAge = "N/A";
let kgSize = 0;

if (existsSync(kgPath)) {
  try {
    const kg = JSON.parse(readFileSync(kgPath, "utf8"));
    entityCount = Object.keys(kg).length;
    factCount = Object.values(kg).reduce(
      (sum, facts) => sum + (Array.isArray(facts) ? facts.length : 0),
      0
    );
    const stat = statSync(kgPath);
    kgAge = formatDate(stat.mtime);
    kgSize = stat.size;
  } catch {
    // ignore
  }
}

// ─── DIARY STATUS ───
let diaryCount = 0;
let lastEntry = null;

if (existsSync(diaryPath)) {
  try {
    const lines = readFileSync(diaryPath, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean);
    diaryCount = lines.length;
    if (lines.length > 0) {
      lastEntry = JSON.parse(lines[lines.length - 1]);
    }
  } catch {
    // ignore
  }
}

// ─── MCP SERVERE ───
let mcpServers = [];
let activeMcpConfigPath = null;
let mcpConfigError = null;
for (const candidate of mcpConfigCandidates) {
  try {
    if (existsSync(candidate)) {
      const mcpConfig = JSON.parse(readFileSync(candidate, "utf8"));
      const servers =
        mcpConfig.mcpServers ||
        mcpConfig.servers ||
        mcpConfig.MCPServers ||
        {};
      const names = Object.keys(servers).filter((k) => servers[k]);
      if (names.length > 0) {
        mcpServers = names;
        activeMcpConfigPath = candidate;
        break;
      }
    }
  } catch (e) {
    mcpConfigError = e.message;
  }
}

// ─── SJEKK OM PYTHON CLI FINNES ───
let pythonCliWarning = null;
try {
  execSync("which mempalace", { stdio: "ignore" });
  pythonCliWarning = "mempalace Python CLI funnet i PATH — IKKE BRUK 'mempalace mine'. Bruk Node.js MCP-serveren.";
} catch {
  // ikke i PATH — OK
}

// ─── LOGG START ───
writeLog({
  ts: nowISO(),
  phase: "start",
  session_id: sessionId,
  pid,
  status: "ok",
  stats: {
    entities: entityCount,
    facts: factCount,
    diary_entries: diaryCount,
    mcp_servers: mcpServers.length,
  },
});

// ─── PRINT ───
console.log("");
console.log("🏛️  MemPalace v3.4.0");
console.log("───────────────────────");
console.log(`  Entities: ${entityCount}  |  Facts: ${factCount}`);
console.log(`  KG:       ${kgSize.toLocaleString("no-NO")} bytes, saved ${kgAge}`);
console.log(`  Diary:    ${diaryCount} entries`);
if (lastEntry) {
  const status = lastEntry.status || "?";
  const type = lastEntry.type || "?";
  const task = lastEntry.task || lastEntry.desc || "?";
  const rating = lastEntry.rating ? "★".repeat(lastEntry.rating) : "";
  console.log(
    `  Last:     [${type}] ${task.slice(0, 40)}${task.length > 40 ? "..." : ""} ${status} ${rating}`
  );
}
console.log(`  MCP:      ${mcpServers.length} server${mcpServers.length === 1 ? "" : "e"}${mcpServers.length > 0 ? " (" + mcpServers.join(", ") + ")" : ""}`);
if (activeMcpConfigPath) {
  console.log(`  Config:   ${activeMcpConfigPath}`);
}
if (mcpConfigError) {
  console.log(`  ⚠️  Config-feil: ${mcpConfigError}`);
}
if (pythonCliWarning) {
  console.log("");
  console.log(`  ⚠️  ADVARSEL: ${pythonCliWarning}`);
}
console.log(`  Session:  ${sessionId}`);
console.log("───────────────────────");
console.log("");
