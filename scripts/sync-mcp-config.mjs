#!/usr/bin/env node
/**
 * Synkroniserer .omp/mcp.json til alle downstream MCP-konfigurasjoner.
 *
 * Brukes av npm run mcp:sync.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const sourceLabel = ".omp/mcp.json";
const sourcePath = resolve(root, sourceLabel);

const destinations = [
  ".mcp/mcp_config.json",
  ".kimi/mcp-config.json",
  ".kimi/mcp_config.json",
  ".claude/mcp.json",
  ".claude/mcp-config.json",
  ".perplexity/mcp_config.json",
  ".perplexity/mcp-config.json",
  ".perplexity/mac-mcp-config.json",
];

function loadJson(label, filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`${label}: missing file ${filePath}`);
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (e) {
    throw new Error(`${label}: invalid JSON — ${e.message}`);
  }
}

const sourceConfig = loadJson(sourceLabel, sourcePath);

let written = 0;
for (const dest of destinations) {
  const destPath = resolve(root, dest);
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, JSON.stringify(sourceConfig, null, 2) + "\n", "utf8");
  written++;
}

console.log(`✅ MCP-configs synchronized from ${sourceLabel} to ${written} files`);
