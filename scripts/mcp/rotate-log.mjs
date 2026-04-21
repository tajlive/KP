#!/usr/bin/env node
/**
 * Log rotation for MCP-bridge
 * Flytter logs/mcp-bridge.log → logs/archive/mcp-bridge-YYYY-MM-DD-HHmmss.log
 */

import { existsSync, renameSync, mkdirSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "../..");
const logFile = resolve(root, "logs", "mcp-bridge.log");
const archiveDir = resolve(root, "logs", "archive");

if (!existsSync(logFile)) {
  console.log("Ingen logg å rotere.");
  process.exit(0);
}

mkdirSync(archiveDir, { recursive: true });

const now = new Date();
const ts = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0"),
  String(now.getHours()).padStart(2, "0"),
  String(now.getMinutes()).padStart(2, "0"),
  String(now.getSeconds()).padStart(2, "0"),
].join("");

const archiveFile = resolve(archiveDir, `mcp-bridge-${ts}.log`);

renameSync(logFile, archiveFile);
console.log(`Rotert: ${logFile} → ${archiveFile}`);
