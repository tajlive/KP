#!/usr/bin/env node
/**
 * Validerer .cursor/mcp.json og .mcp/mcp_config.json (JSON + nøkkel-/innholdssynk).
 * Brukes i CI (mcp-integration) og npm run auto:preflight / mcp:validate-config.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cursorPath = resolve(root, ".cursor/mcp.json");
const mcpPath = resolve(root, ".mcp/mcp_config.json");

function loadJson(label, filePath) {
  if (!existsSync(filePath)) {
    console.error(`❌ ${label}: mangler fil ${filePath}`);
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (e) {
    console.error(`❌ ${label}: ugyldig JSON —`, e.message);
    process.exit(1);
  }
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

const cursor = loadJson(".cursor/mcp.json", cursorPath);
const mcp = loadJson(".mcp/mcp_config.json", mcpPath);

const cServers = cursor.mcpServers;
const mServers = mcp.mcpServers;

if (!cServers || typeof cServers !== "object") {
  console.error("❌ .cursor/mcp.json: mangler mcpServers-objekt");
  process.exit(1);
}
if (!mServers || typeof mServers !== "object") {
  console.error("❌ .mcp/mcp_config.json: mangler mcpServers-objekt");
  process.exit(1);
}

const cKeys = Object.keys(cServers).sort();
const mKeys = Object.keys(mServers).sort();

if (cKeys.join("\0") !== mKeys.join("\0")) {
  console.error("❌ MCP server-nøkler matcher ikke:");
  console.error("   .cursor:", JSON.stringify(cKeys));
  console.error("   .mcp:   ", JSON.stringify(mKeys));
  process.exit(1);
}

for (const name of cKeys) {
  const a = stableStringify(cServers[name]);
  const b = stableStringify(mServers[name]);
  if (a !== b) {
    console.error(`❌ MCP server «${name}»: innhold avviker mellom .cursor og .mcp`);
    process.exit(1);
  }
}

console.log(`✅ MCP-konfig OK — ${cKeys.length} servere synket (.cursor ↔ .mcp)`);
process.exit(0);
