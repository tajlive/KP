#!/usr/bin/env node
/**
 * Sentry MCP wrapper — laster env-vars fra .env.local
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./load-env.mjs";
import { gracefulExit } from "./mcp-graceful-exit.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const env = loadEnvLocal();

const sentryMissing = ["SENTRY_AUTH_TOKEN", "SENTRY_ORG"].filter((k) => !env[k]);
if (sentryMissing.length) {
  gracefulExit(sentryMissing, "run-sentry-mcp");
}

// sentry-mcp krever --access-token parameter
const child = spawn(
  "npx",
  ["-y", "@sentry/mcp-server@latest", "--access-token", env.SENTRY_AUTH_TOKEN],
  { 
    env: { 
      ...env,
      SENTRY_ORG: env.SENTRY_ORG,
      SENTRY_PROJECT: env.SENTRY_PROJECT || "klarpakke-production"
    }, 
    stdio: "inherit", 
    cwd: root 
  }
);

child.on("exit", (code) => process.exit(code ?? 0));
