#!/usr/bin/env node
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const env = { ...process.env, ...loadEnvLocal() };

if (!env.OPIK_API_KEY) {
  console.error("[run-opik-mcp] OPIK_API_KEY ikke satt i .env.local");
  process.exit(1);
}

const child = spawn(
  "npx", ["-y", "opik-mcp", "--apiKey", env.OPIK_API_KEY],
  { env, stdio: "inherit", cwd: root }
);
child.on("exit", (code) => process.exit(code ?? 0));
