#!/usr/bin/env node
/**
 * Offisiell Supabase MCP wrapper — laster alle env-vars fra .env.local
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./load-env.mjs";
import { gracefulExit } from "./mcp-graceful-exit.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const env = loadEnvLocal();

if (!env.SUPABASE_ACCESS_TOKEN) {
  gracefulExit(["SUPABASE_ACCESS_TOKEN"], "run-official-supabase-mcp");
}

let projectRef = env.SUPABASE_PROJECT_REF?.trim();
if (!projectRef && env.NEXT_PUBLIC_SUPABASE_URL) {
  const m = env.NEXT_PUBLIC_SUPABASE_URL.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  if (m) projectRef = m[1];
}
if (!projectRef) {
  projectRef = "vuxbjlykgmzskxbclquf";
}

const child = spawn(
  "npx",
  ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", env.SUPABASE_ACCESS_TOKEN, "--project-ref", projectRef],
  { env, stdio: "inherit", cwd: root }
);

child.on("exit", (code) => process.exit(code ?? 0));
