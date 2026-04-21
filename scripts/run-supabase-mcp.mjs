#!/usr/bin/env node
/**
 * Supabase MCP wrapper — laster DATABASE_URL og alle andre env-vars fra .env.local
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

// Sjekk at vi har det vi trenger
if (!env.DATABASE_URL && !env.POSTGRES_URL) {
  gracefulExit(["DATABASE_URL", "POSTGRES_URL"], "run-supabase-mcp");
  process.exit(0);
}

// Bruk POSTGRES_URL som fallback for DATABASE_URL
if (!env.DATABASE_URL && env.POSTGRES_URL) {
  env.DATABASE_URL = env.POSTGRES_URL;
}

const child = spawn(
  "node",
  [resolve(__dirname, "supabase-mcp-server.mjs")],
  { env, stdio: "inherit", cwd: root }
);

child.on("exit", (code) => process.exit(code ?? 0));
