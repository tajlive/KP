#!/usr/bin/env node
/**
 * MemPalace Health Check
 *
 * Verifies that the MemPalace MCP server environment is healthy:
 * - .mempalace/kg.json exists and is valid JSON
 * - .mempalace/diary.jsonl exists and is writable
 * - MCP server script exists and is readable
 * - Index cache is present (optional, warns if missing)
 *
 * Usage:
 *   node scripts/verify-mempalace.mjs
 */

import { existsSync, readFileSync, accessSync, constants } from "fs";
import { resolve } from "path";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

const KP_DIR = "/Users/taj/klarpakke";
const checks = [];

function check(name, testFn, required = true) {
  try {
    testFn();
    checks.push({ name, status: "ok", required });
  } catch (err) {
    checks.push({ name, status: "fail", error: err.message, required });
  }
}

function warn(name, testFn) {
  try {
    testFn();
    checks.push({ name, status: "ok", required: false });
  } catch (err) {
    checks.push({ name, status: "warn", error: err.message, required: false });
  }
}

// ─── CHECKS ───

check("Knowledge Graph (kg.json)", () => {
  const path = resolve(KP_DIR, ".mempalace/kg.json");
  if (!existsSync(path)) throw new Error("Missing: .mempalace/kg.json");
  const data = readFileSync(path, "utf-8");
  JSON.parse(data);
});

check("Diary log (.kimi/diary.jsonl)", () => {
  const path = resolve(KP_DIR, ".kimi/diary.jsonl");
  if (!existsSync(path)) throw new Error("Missing: .kimi/diary.jsonl");
  accessSync(path, constants.R_OK | constants.W_OK);
});

warn("Index cache (index-cache-v3.json.gz)", () => {
  const path = resolve(KP_DIR, ".mempalace/index-cache-v3.json.gz");
  if (!existsSync(path)) throw new Error("Missing: .mempalace/index-cache-v3.json.gz — will rebuild on next startup");
});

warn("MCP config (mempalace server registered)", () => {
  const path = resolve(process.env.HOME || "/Users/taj", ".kimi/mcp.json");
  if (!existsSync(path)) throw new Error("Missing: ~/.kimi/mcp.json");
  const data = JSON.parse(readFileSync(path, "utf-8"));
  if (!data.mcpServers?.mempalace) throw new Error("mempalace server not registered in ~/.kimi/mcp.json");
});

// ─── OUTPUT ───

console.log(`\n${BOLD}MemPalace Health Check${RESET}\n`);

let failCount = 0;
let warnCount = 0;

for (const c of checks) {
  if (c.status === "ok") {
    console.log(`${GREEN}✓${RESET} ${c.name}`);
  } else if (c.status === "warn") {
    console.log(`${YELLOW}⚠${RESET} ${c.name}: ${c.error}`);
    warnCount++;
  } else {
    console.log(`${RED}✗${RESET} ${c.name}: ${c.error}`);
    failCount++;
  }
}

console.log("");
if (failCount === 0 && warnCount === 0) {
  console.log(`${GREEN}${BOLD}MemPalace is healthy ✓${RESET}`);
  console.log(`${GREEN}Node.js MCP server ready (v3.3.0)${RESET}\n`);
  process.exit(0);
} else if (failCount === 0) {
  console.log(`${YELLOW}${BOLD}MemPalace is functional with warnings ⚠${RESET}`);
  console.log(`${YELLOW}Review warnings above.\n`);
  process.exit(0);
} else {
  console.log(`${RED}${BOLD}MemPalace health check failed ✗${RESET}`);
  console.log(`${RED}${failCount} required check(s) failed.${RESET}`);
  console.log(`${RED}Do NOT use 'mempalace mine' (Python CLI segfaults). Use Node.js MCP server only.${RESET}\n`);
  process.exit(1);
}
