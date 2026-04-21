#!/usr/bin/env node
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./load-env.mjs";
import { gracefulExit } from "./mcp-graceful-exit.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const env = { ...process.env, ...loadEnvLocal() };

if (!env.OPIK_API_KEY) {
  gracefulExit(["OPIK_API_KEY"], "run-opik-mcp");
}

const child = spawn(
  "npx", ["-y", "opik-mcp", "--apiKey", env.OPIK_API_KEY],
  { env, stdio: "inherit", cwd: root }
);
child.on("exit", (code) => process.exit(code ?? 0));
