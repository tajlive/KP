#!/usr/bin/env node
/**
 * Vercel MCP wrapper — laster alle env-vars fra .env.local
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Last alle env-vars fra .env.local
const env = loadEnvLocal();

if (!env.VERCEL_TOKEN) {
  console.error("[run-vercel-mcp] VERCEL_TOKEN ikke satt i .env.local");
  process.exit(1);
}

const child = spawn(
  "npx",
  ["-y", "vercel-mcp@latest"],
  { env, stdio: "inherit", cwd: root }
);

child.on("exit", (code) => process.exit(code ?? 0));
