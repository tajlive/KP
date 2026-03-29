#!/usr/bin/env node
/**
 * Klarpakke MCP wrapper — kobler til Supabase via Edge Function
 * 
 * Dette gir AI-verktøy (Cursor, Kimi, Claude) direkte tilgang til:
 * - trading_sessions, trades, ai_decision_log
 * - auto_trades, trade_history, auto_trade_log
 * - user_profiles, notification_preferences
 * 
 * Bruker mcp-remote for å proxye HTTP MCP over stdio.
 * 
 * Edge Function: https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/klarpakke-mcp/mcp
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const env = loadEnvLocal();

// Sjekk at KLARPAKKE_MCP_TOKEN er satt
if (!env.KLARPAKKE_MCP_TOKEN) {
  console.error("[run-klarpakke-mcp] KLARPAKKE_MCP_TOKEN ikke satt i .env.local");
  console.error("[run-klarpakke-mcp] Sett tokenet for å aktivere Supabase MCP:");
  console.error("");
  console.error("  echo 'KLARPAKKE_MCP_TOKEN=sb_xxx_...' >> .env.local");
  console.error("");
  console.error("[run-klarpakke-mcp] Token finnes i Supabase Dashboard → Edge Functions → klarpakke-mcp");
  process.exit(1);
}

// MCP endpoint URL
const MCP_URL = "https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/klarpakke-mcp/mcp";

// Start mcp-remote med auth header
const child = spawn(
  "npx",
  [
    "-y",
    "mcp-remote@latest",
    MCP_URL,
    "--header",
    `Authorization:Bearer ${env.KLARPAKKE_MCP_TOKEN}`
  ],
  { env, stdio: "inherit", cwd: root }
);

child.on("exit", (code) => process.exit(code ?? 0));
