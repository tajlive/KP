#!/usr/bin/env node
/**
 * Opik MCP wrapper — laster OPIK_API_KEY fra .env.local
 * Opik gir LLM observability, traces, metrics og prompt management
 * 
 * Dokumentasjon: https://www.comet.com/docs/opik/
 * GitHub: https://github.com/comet-ml/opik-mcp
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const env = loadEnvLocal();

if (!env.OPIK_API_KEY) {
  console.error("[run-opik-mcp] OPIK_API_KEY ikke satt i .env.local");
  console.error("[run-opik-mcp] Skaff API-nøkkel fra: https://www.comet.com/site/");
  console.error("[run-opik-mcp] Alternativt: npm install -g @comet-ml/opik-mcp && opik-mcp login");
  process.exit(1);
}

const child = spawn(
  "npx",
  ["-y", "@comet-ml/opik-mcp@latest"],
  { env, stdio: "inherit", cwd: root }
);

child.on("exit", (code) => process.exit(code ?? 0));
