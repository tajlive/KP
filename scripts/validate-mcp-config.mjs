#!/usr/bin/env node
/**
 * Validerer MCP-konfigurasjon på tvers av ALLE config-filer i prosjektet.
 *
 * Brukes i CI (mcp-integration) og npm run mcp:validate-config / mcp:audit.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const configFiles = [
  { label: ".omp/mcp.json", path: resolve(root, ".omp/mcp.json") },
  { label: ".mcp/mcp_config.json", path: resolve(root, ".mcp/mcp_config.json") },
  { label: ".kimi/mcp-config.json", path: resolve(root, ".kimi/mcp-config.json") },
  { label: ".kimi/mcp_config.json", path: resolve(root, ".kimi/mcp_config.json") },
  { label: ".claude/mcp.json", path: resolve(root, ".claude/mcp.json") },
  { label: ".claude/mcp-config.json", path: resolve(root, ".claude/mcp-config.json") },
  { label: ".perplexity/mcp_config.json", path: resolve(root, ".perplexity/mcp_config.json") },
  { label: ".perplexity/mcp-config.json", path: resolve(root, ".perplexity/mcp-config.json") },
  { label: ".perplexity/mac-mcp-config.json", path: resolve(root, ".perplexity/mac-mcp-config.json") },
];

const masterLabel = ".omp/mcp.json";
const masterPath = resolve(root, masterLabel);

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

function getRunnerScripts(config) {
  const runners = [];
  const servers = config.mcpServers || {};
  for (const [name, server] of Object.entries(servers)) {
    if (name.startsWith("_")) continue;
    const cmd = server.command;
    const args = server.args || [];
    // Look for local wrapper scripts (relative or absolute paths within repo)
    const cmdName = typeof cmd === "string" ? cmd.replace(/.*[/\\]/, "") : "";
    if (cmdName === "node" || cmdName === "node.exe" || cmdName === "npx") {
      for (const arg of args) {
        if (typeof arg === "string" && arg.includes("scripts/run-")) {
          // Normalize absolute repo paths to relative for existence check
          const relative = arg.replace(root + "/", "").replace(/^\//, "");
          runners.push(relative);
        }
      }
    }
  }
  return runners;
}

// ─── Load master ───
const masterConfig = loadJson(masterLabel, masterPath);
const mServers = masterConfig.mcpServers;
if (!mServers || typeof mServers !== "object") {
  console.error("❌ Master config mangler mcpServers-objekt");
  process.exit(1);
}

// ─── Validate all configs exist and are valid JSON ───
const loadedConfigs = [];
let missingFiles = 0;
for (const { label, path: p } of configFiles) {
  if (!existsSync(p)) {
    console.warn(`⚠️  ${label}: mangler fil — hoppes over`);
    missingFiles++;
    continue;
  }
  const data = loadJson(label, p);
  loadedConfigs.push({ label, path: p, data });
}

// ─── Compare each to master (skip special non-master configs that are intentionally different) ───
const skipSyncCheck = new Set([
  // .omp/mcp.json is the source of truth; all downstream configs are synced verbatim.
]);

let syncErrors = 0;
for (const { label, data } of loadedConfigs) {
  if (skipSyncCheck.has(label)) continue;
  const theirServers = data.mcpServers;
  if (!theirServers || typeof theirServers !== "object") {
    console.error(`❌ ${label}: mangler mcpServers-objekt`);
    syncErrors++;
    continue;
  }
  const masterKeys = Object.keys(mServers).sort();
  const theirKeys = Object.keys(theirServers).sort();
  if (masterKeys.join("\0") !== theirKeys.join("\0")) {
    console.error(`❌ ${label}: server-nøkler matcher ikke master`);
    console.error("   master:", JSON.stringify(masterKeys));
    console.error("   theirs:", JSON.stringify(theirKeys));
    syncErrors++;
    continue;
  }
  for (const name of masterKeys) {
    if (name.startsWith("_")) continue;
    const masterVal = stableStringify(mServers[name]);
    const theirVal = stableStringify(theirServers[name]);
    if (masterVal !== theirVal) {
      console.error(`❌ ${label}: server «${name}» avviker fra master`);
      syncErrors++;
    }
  }
}

// ─── Validate runner scripts exist ───
const allRunners = new Set();
for (const { data } of loadedConfigs) {
  for (const r of getRunnerScripts(data)) {
    allRunners.add(r);
  }
}

let runnerErrors = 0;
for (const runner of allRunners) {
  const runnerPath = resolve(root, runner);
  if (!existsSync(runnerPath)) {
    console.error(`❌ Runner script mangler: ${runner}`);
    runnerErrors++;
  }
}

// ─── Validate _meta.version on master ───
const expectedVersion = "2.9-minimal";
if (!masterConfig._meta || masterConfig._meta.version !== expectedVersion) {
  console.warn(`⚠️  Master config _meta.version er ikke ${expectedVersion} (fant: ${masterConfig._meta?.version || "mangler"})`);
}

// ─── Summary ───
const totalFiles = loadedConfigs.length;
const totalRunners = allRunners.size;

console.log(`🔍 MCP Audit — ${totalFiles} config-filer sjekket, ${missingFiles} manglet, ${totalRunners} runner-scripts verifisert`);

if (syncErrors > 0 || runnerErrors > 0) {
  console.error(`\n❌ Audit FAILED — ${syncErrors} sync-feil, ${runnerErrors} runner-feil`);
  process.exit(1);
}

console.log(`✅ MCP-konfigurasjon OK — ${Object.keys(mServers).filter(k => !k.startsWith("_")).length} servere synket på tvers av ${totalFiles} filer`);
process.exit(0);
