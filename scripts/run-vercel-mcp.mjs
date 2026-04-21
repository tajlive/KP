#!/usr/bin/env node
/**
 * Vercel MCP wrapper — laster alle env-vars fra .env.local
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./load-env.mjs";
import { gracefulExit } from "./mcp-graceful-exit.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Last alle env-vars fra .env.local
const env = loadEnvLocal();

if (!env.VERCEL_TOKEN) {
  gracefulExit(["VERCEL_TOKEN"], "run-vercel-mcp");
}

// vercel-mcp@0.0.7 forventer VERCEL_API_KEY som kommando-linje argument
const child = spawn(
  "npx",
  ["-y", "vercel-mcp@latest", `VERCEL_API_KEY=${env.VERCEL_TOKEN}`],
  { env, stdio: "inherit", cwd: root }
);

child.on("exit", (code) => process.exit(code ?? 0));
