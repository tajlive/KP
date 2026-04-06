#!/usr/bin/env node
/**
 * Sentry MCP wrapper — laster env-vars fra .env.local
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const env = loadEnvLocal();

if (!env.SENTRY_AUTH_TOKEN) {
  console.error("[run-sentry-mcp] SENTRY_AUTH_TOKEN mangler i .env.local");
  process.exit(1);
}

if (!env.SENTRY_ORG) {
  console.error("[run-sentry-mcp] SENTRY_ORG mangler i .env.local");
  process.exit(1);
}

const child = spawn(
  "npx",
  ["-y", "@sentry/mcp-server@latest"],
  { 
    env: { 
      ...env, 
      SENTRY_AUTH_TOKEN: env.SENTRY_AUTH_TOKEN,
      SENTRY_ORG: env.SENTRY_ORG,
      SENTRY_PROJECT: env.SENTRY_PROJECT || "klarpakke-production"
    }, 
    stdio: "inherit", 
    cwd: root 
  }
);

child.on("exit", (code) => process.exit(code ?? 0));
