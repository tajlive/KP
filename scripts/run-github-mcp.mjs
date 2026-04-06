#!/usr/bin/env node
/**
 * GitHub MCP wrapper — laster GH_PAT fra .env.local
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const env = loadEnvLocal();

// GitHub token kan være GH_PAT eller GITHUB_TOKEN
if (!env.GH_PAT && !env.GITHUB_TOKEN) {
  console.error("[run-github-mcp] GH_PAT eller GITHUB_TOKEN ikke satt i .env.local");
  process.exit(1);
}

// Bruk GITHUB_TOKEN som fallback
if (!env.GITHUB_TOKEN && env.GH_PAT) {
  env.GITHUB_TOKEN = env.GH_PAT;
}

const child = spawn(
  "npx",
  ["-y", "@github/mcp-server@latest"],
  { env, stdio: "inherit", cwd: root }
);

child.on("exit", (code) => process.exit(code ?? 0));
