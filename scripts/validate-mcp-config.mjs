#!/usr/bin/env node
/**
 * Validerer MCP-konfigurasjon på tvers av alle tre filer:
 * - .cursor/mcp.json (master)
 * - .mcp/mcp_config.json (kopi 1)
 * - .kimi/mcp-config.json (kopi 2)
 * 
 * Brukes i CI (mcp-integration) og npm run mcp:validate-config.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cursorPath = resolve(root, ".cursor/mcp.json");
const mcpPath = resolve(root, ".mcp/mcp_config.json");
const kimiPath = resolve(root, ".kimi/mcp-config.json");

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
const kimi = loadJson(".kimi/mcp-config.json", kimiPath);

const cServers = cursor.mcpServers;
const mServers = mcp.mcpServers;
const kServers = kimi.mcpServers;

if (!cServers || typeof cServers !== "object") {
  console.error("❌ .cursor/mcp.json: mangler mcpServers-objekt");
  process.exit(1);
}
if (!mServers || typeof mServers !== "object") {
  console.error("❌ .mcp/mcp_config.json: mangler mcpServers-objekt");
  process.exit(1);
}
if (!kServers || typeof kServers !== "object") {
  console.error("❌ .kimi/mcp-config.json: mangler mcpServers-objekt");
  process.exit(1);
}

const cKeys = Object.keys(cServers).sort();
const mKeys = Object.keys(mServers).sort();
const kKeys = Object.keys(kServers).sort();

// Sjekk server-nøkler mot master
if (cKeys.join("\0") !== mKeys.join("\0")) {
  console.error("❌ MCP server-nøkler matcher ikke (.cursor vs .mcp):");
  console.error("   .cursor:", JSON.stringify(cKeys));
  console.error("   .mcp:   ", JSON.stringify(mKeys));
  process.exit(1);
}

if (cKeys.join("\0") !== kKeys.join("\0")) {
  console.error("❌ MCP server-nøkler matcher ikke (.cursor vs .kimi):");
  console.error("   .cursor:", JSON.stringify(cKeys));
  console.error("   .kimi:  ", JSON.stringify(kKeys));
  process.exit(1);
}

// Sjekk innhold mot master
for (const name of cKeys) {
  const master = stableStringify(cServers[name]);
  const mcpVal = stableStringify(mServers[name]);
  const kimiVal = stableStringify(kServers[name]);
  
  if (master !== mcpVal) {
    console.error(`❌ MCP server «${name}»: innhold avviker mellom .cursor og .mcp`);
    process.exit(1);
  }
  if (master !== kimiVal) {
    console.error(`❌ MCP server «${name}»: innhold avviker mellom .cursor og .kimi`);
    process.exit(1);
  }
}

console.log(`✅ MCP-konfig OK — ${cKeys.length} servere synket (3 filer)`);
process.exit(0);
