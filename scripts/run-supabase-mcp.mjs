#!/usr/bin/env node
/**
 * Wrapper for Supabase MCP server — laster DATABASE_URL fra .env.local og starter MCP.
 * Cursor: .cursor/mcp.json peker hit så MCP får DATABASE_URL uten å sette den i IDE.
 *
 * Usage: node scripts/run-supabase-mcp.mjs
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
          if (key === "DATABASE_URL" || key === "DATABASE_URL_MIGRATION") env[key] = value;
        }
      }
    }
  } catch (e) {
    console.error("[run-supabase-mcp] Could not read .env.local:", e.message);
  }
}

if (!env.DATABASE_URL && !env.DATABASE_URL_MIGRATION) {
  console.error("[run-supabase-mcp] DATABASE_URL ikke satt. Legg den i .env.local (Postgres connection string fra Supabase Dashboard → Database).");
  process.exit(1);
}

const child = spawn("node", [resolve(__dirname, "supabase-mcp-server.mjs")], {
  env,
  stdio: "inherit",
  cwd: root,
});

child.on("exit", (code) => process.exit(code ?? 0));
