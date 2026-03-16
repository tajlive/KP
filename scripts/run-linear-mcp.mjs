#!/usr/bin/env node
/**
 * Wrapper for Linear MCP server that loads LINEAR_API_KEY from .env.local.
 * Cursor runs this so the MCP gets the key even when env isn't set in the shell.
 *
 * Usage: node scripts/run-linear-mcp.mjs
 * (Cursor mcp.json points command here)
 */
import { spawn } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

const env = { ...process.env };

if (existsSync(envPath)) {
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eq = trimmed.indexOf("=");
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          let value = trimmed.slice(eq + 1).trim();
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/\\"/g, '"');
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1).replace(/\\'/g, "'");
          if (key === "LINEAR_API_KEY") env[key] = value;
        }
      }
    }
  } catch (e) {
    console.error("[run-linear-mcp] Could not read .env.local:", e.message);
  }
}

if (!env.LINEAR_API_KEY) {
  console.error("[run-linear-mcp] LINEAR_API_KEY not set. Add it to .env.local or export it.");
  process.exit(1);
}

const child = spawn("npx", ["-y", "linear-mcp-server@latest"], {
  env,
  stdio: "inherit",
  cwd: root,
});

child.on("exit", (code) => process.exit(code ?? 0));
