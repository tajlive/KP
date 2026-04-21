#!/usr/bin/env node
/**
 * Perplexity MCP wrapper v2.0 — optimalisert for KIMI CLI v1.36.0
 * - Laster PERPLEXITY_API_KEY fra .env.local
 * - Bruker lokal installasjon hvis tilgjengelig, ellers npx med caching
 * - Håndterer graceful exit ved manglende API key
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { loadEnvLocal } from "./load-env.mjs";
import { gracefulExit } from "./mcp-graceful-exit.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const env = loadEnvLocal();

if (!env.PERPLEXITY_API_KEY) {
  gracefulExit(["PERPLEXITY_API_KEY"], "perplexity-mcp");
}

// Sjekk om lokal installasjon finnes (raskere enn npx)
const localPaths = [
  resolve(root, "node_modules/perplexity-mcp/dist/index.js"),
  resolve(root, "node_modules/perplexity-mcp/index.js"),
  resolve(root, "node_modules/.bin/perplexity-mcp"),
];

let localPath = null;
for (const p of localPaths) {
  if (existsSync(p)) {
    localPath = p;
    break;
  }
}

let child;
if (localPath) {
  console.error(`[perplexity-mcp] Bruker lokal installasjon: ${localPath}`);
  child = spawn("node", [localPath], { env, stdio: "inherit", cwd: root });
} else {
  console.error("[perplexity-mcp] Bruker npx (vurder: npm install perplexity-mcp@0.2.3 --save-dev)");
  child = spawn(
    "npx",
    ["-y", "perplexity-mcp@0.2.3"],
    { env, stdio: "inherit", cwd: root }
  );
}

child.on("exit", (code) => process.exit(code ?? 0));
