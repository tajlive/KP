#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const command = process.argv[2] || "bridge";

const script =
  command === "login"
    ? "cli-login.ts"
    : "index.ts";

const target = join(__dirname, "..", "tools", "kimi-oauth-bridge", "src", script);

const child = spawn("npx", ["tsx", target], {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env,
});

child.on("error", (error) => {
  console.error("Failed to start bridge:", error.message);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
