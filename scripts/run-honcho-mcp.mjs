#!/usr/bin/env node
/**
 * Honcho MCP wrapper — laster HONCHO_API_KEY og andre env-vars fra .env.local,
 * og spawner npx mcp-remote mot https://mcp.honcho.dev.
 *
 * Mønster: Samme som run-supabase-mcp.mjs — wrapper som laster .env.local
 * før MCP-serveren startes, slik at KIMI CLI får credentials.
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
if (!env.HONCHO_API_KEY) {
  gracefulExit(["HONCHO_API_KEY"], "run-honcho-mcp");
  process.exit(0);
}

// Defaults
const userName = env.HONCHO_USER_NAME || "Tom";
const assistantName = env.HONCHO_ASSISTANT_NAME || "KIMI";
const workspaceId = env.HONCHO_WORKSPACE_ID || "";

const args = [
  "-y",
  "mcp-remote",
  "https://mcp.honcho.dev",
  "--header",
  `Authorization: Bearer ${env.HONCHO_API_KEY}`,
  "--header",
  `X-Honcho-User-Name: ${userName}`,
  "--header",
  `X-Honcho-Assistant-Name: ${assistantName}`,
];

if (workspaceId) {
  args.push("--header", `X-Honcho-Workspace-ID: ${workspaceId}`);
}

const child = spawn("npx", args, {
  env,
  stdio: "inherit",
  cwd: root,
});

child.on("exit", (code) => process.exit(code ?? 0));
