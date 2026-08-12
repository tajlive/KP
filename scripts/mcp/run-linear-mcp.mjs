#!/usr/bin/env node
/* eslint-env node */
/**
 * run-linear-mcp.mjs — wrapper for Linear MCP (scripts/mcp/linear-mcp.ts).
 *
 * Startvei for Hermes MCP-registrering (mcp_servers.linear):
 *   command: node
 *   args:    ['/Users/taj/klarpakke/scripts/mcp/run-linear-mcp.mjs']
 *   cwd:     /Users/taj/klarpakke
 *
 * Oppførsel:
 *  1. Laster LINEAR_API_KEY fra <repo>/.env.local (kun variabler som ikke
 *     allerede er satt i prosessmiljøet — prosessmiljø vinner).
 *  2. Nøkkel tilgjengelig  → spawner dist/linear-mcp.js med stdio videresendt.
 *  3. Nøkkel MANGLER       → kjører innebygd no-op MCP (0 verktøy, tools/call
 *     svarer med feil). Hermes starter da serveren uten krasj, og Linear-
 *     verktøyene er bare utilgjengelige — ingen hard feil ved øktstart.
 *
 * Ingen secrets logges; .env.local leses kun inn i miljøet.
 */
import { spawn } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const DIST_SERVER = resolve(__dirname, "dist", "linear-mcp.js");

// ── 1. Last .env.local (fyller kun variabler som ikke allerede er satt) ─────
const env = { ...process.env };
const envLocal = resolve(REPO_ROOT, ".env.local");
try {
  if (existsSync(envLocal)) {
    const raw = readFileSync(envLocal, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !(m[1] in env)) {
        env[m[1]] = m[2].trim();
      }
    }
  }
} catch {
  // .env.local er valgfri — miljøet kan ha satt nøkkelen selv.
}

const hasKey = typeof env.LINEAR_API_KEY === "string" && env.LINEAR_API_KEY.length > 0;

// ── 2. Ekte server ───────────────────────────────────────────────────────────
if (hasKey) {
  if (!existsSync(DIST_SERVER)) {
    console.error(
      `[linear-mcp] dist/linear-mcp.js mangler — kjør: node scripts/mcp/build-linear.mjs`,
    );
    process.exit(1);
  }
  const child = spawn(process.execPath, [DIST_SERVER], {
    env,
    stdio: "inherit",
  });
  child.on("exit", (code, signal) => {
    process.exit(code ?? (signal ? 1 : 0));
  });
  child.on("error", (err) => {
    console.error(`[linear-mcp] Kunne ikke starte server: ${err.message}`);
    process.exit(1);
  });
} else {
  // ── 3. No-op MCP når LINEAR_API_KEY mangler ────────────────────────────────
  console.error(
    "[linear-mcp] LINEAR_API_KEY mangler (verken i prosessmiljø eller .env.local) — kjører i no-op-modus (0 verktøy).",
  );
  const server = new Server(
    { name: "linear-hermes-noop", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [] }));
  server.setRequestHandler(CallToolRequestSchema, async () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify({
          error: "LINEAR_API_KEY mangler — Linear MCP kjører i no-op-modus.",
        }),
      },
    ],
    isError: true,
  }));
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
