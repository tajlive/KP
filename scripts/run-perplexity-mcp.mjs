#!/usr/bin/env node
/**
 * Perplexity MCP wrapper — laster PERPLEXITY_API_KEY fra .env.local
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const env = loadEnvLocal();

if (!env.PERPLEXITY_API_KEY) {
  console.error("[run-perplexity-mcp] PERPLEXITY_API_KEY ikke satt i .env.local");
  process.exit(1);
}

const child = spawn(
  "npx",
  ["-y", "perplexity-mcp@0.2.3"],
  { env, stdio: "inherit", cwd: root }
);

child.on("exit", (code) => process.exit(code ?? 0));
