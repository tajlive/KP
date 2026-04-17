#!/usr/bin/env node
/**
 * Resend MCP wrapper — laster RESEND_API_KEY fra .env.local
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const env = loadEnvLocal();

if (!env.RESEND_API_KEY) {
  console.error("[run-resend-mcp] RESEND_API_KEY mangler i .env.local");
  process.exit(1);
}

const child = spawn(
  "npx",
  ["-y", "resend-mcp@2.2.0"],
  { env, stdio: "inherit", cwd: root }
);

child.on("exit", (code) => process.exit(code ?? 0));
