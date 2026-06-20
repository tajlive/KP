#!/usr/bin/env node
/**
 * 🔥 MCP Smoke Test — v2.0 (2026-06-20)
 * Tester alle MCP-servere konfigurert i .mcp/mcp_config.json (repo-config)
 * ved å spawn'e hver server og sende en JSON-RPC initialize-forespørsel.
 *
 * Erstatter v1.0 som testet ~/.kimi/mcp.json via `kimi mcp test`.
 */

import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const configPath = resolve(root, ".mcp/mcp_config.json");

function loadConfig() {
  if (!existsSync(configPath)) {
    throw new Error(`Repo-config finnes ikke: ${configPath}`);
  }
  try {
    return JSON.parse(readFileSync(configPath, "utf8"));
  } catch (e) {
    throw new Error(`Ugyldig JSON i ${configPath}: ${e.message}`);
  }
}

function resolveArg(arg) {
  if (typeof arg !== "string") return arg;
  // Håndter både absolutte stier og stier relative til repo-root
  if (arg.startsWith("/")) return arg;
  if (arg.startsWith("scripts/")) return resolve(root, arg);
  return resolve(root, arg);
}

function sendInitialize(proc) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill();
      reject(new Error("timeout etter 15s"));
    }, 15000);

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
      const lines = stdout.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          if (msg.id === 1) {
            if (msg.result?.protocolVersion) {
              if (!settled) {
                settled = true;
                clearTimeout(timer);
                proc.kill();
                resolve(msg);
              }
            } else if (msg.error) {
              if (!settled) {
                settled = true;
                clearTimeout(timer);
                proc.kill();
                reject(new Error(msg.error.message || JSON.stringify(msg.error)));
              }
            }
          }
        } catch {
          // Ikke gyldig JSON enda, fortsett å lese
        }
      }
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });

    proc.on("exit", (code) => {
      if (!settled && code !== 0 && code !== null) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`exit code ${code}${stderr ? `: ${stderr.trim()}` : ""}`));
      }
    });

    const initMsg = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "mcp-smoke-test", version: "2.0" },
      },
    };
    proc.stdin.write(JSON.stringify(initMsg) + "\n");
  });
}

async function testServer(name, server) {
  const args = (server.args || []).map(resolveArg);
  const proc = spawn(server.command, args, { cwd: root, env: process.env });
  try {
    await sendInitialize(proc);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function main() {
  const config = loadConfig();
  const servers = config.mcpServers || {};

  if (Object.keys(servers).length === 0) {
    throw new Error("Ingen MCP-servere funnet i .mcp/mcp_config.json");
  }

  let passed = 0;
  let failed = 0;

  console.log("🔥 MCP Smoke Test (repo-config: .mcp/mcp_config.json)");
  console.log("═══════════════════════════════════════════════════════");

  for (const [name, server] of Object.entries(servers)) {
    process.stdout.write(`  ${name} … `);
    const result = await testServer(name, server);
    if (result.ok) {
      console.log("✅");
      passed++;
    } else {
      console.log(`❌ (${result.error})`);
      failed++;
    }
  }

  console.log("═══════════════════════════════════════════════════════");
  console.log(`Resultat: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log("\nFeilsøking:");
    console.log("  1. Sjekk at .mcp/mcp_config.json er gyldig JSON");
    console.log("  2. Sjekk at wrapper-scripts i scripts/run-*-mcp.mjs finnes og er kjørbare");
    console.log("  3. Sjekk at nødvendige env-vars er satt for eksterne servere");
    process.exit(1);
  }

  console.log("\n✅ All MCP-servere operative");
  process.exit(0);
}

main().catch((err) => {
  console.error("💥 Smoke test feilet:", err.message);
  process.exit(1);
});
