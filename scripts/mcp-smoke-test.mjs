#!/usr/bin/env node
/**
 * 🔥 MCP Smoke Test — v2.1 (2026-06-27)
 * Tester alle MCP-servere konfigurert i .mcp/mcp_config.json (repo-config)
 * ved å spawn'e hver server, sende initialize og deretter tools/list.
 *
 * For Chrome-serveren verifiserer dette at verktøyene eksponeres uten å måtte
 * starte selve nettleseren.
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

function sendInitialize(proc, { keepAlive = false } = {}) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let initOk = false;
    let toolsOk = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill();
      reject(new Error("timeout etter 15s"));
    }, 15000);

    function safeWrite(msg) {
      try {
        if (!proc.stdin.destroyed) {
          proc.stdin.write(JSON.stringify(msg) + "\n");
        }
      } catch (err) {
        // Ignore EPIPE if process closed early
      }
    }

    function finish() {
      if (initOk && toolsOk && !settled) {
        settled = true;
        clearTimeout(timer);
        if (!keepAlive) {
          proc.kill();
        }
        resolve({ initOk, toolsOk });
      }
    }

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
      const lines = stdout.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          if (msg.id === 1) {
            if (msg.result?.protocolVersion) {
              initOk = true;
              // Send tools/list etter vellykket initialize
              const listMsg = {
                jsonrpc: "2.0",
                id: 2,
                method: "tools/list",
                params: {},
              };
              safeWrite(listMsg);
            } else if (msg.error) {
              if (!settled) {
                settled = true;
                clearTimeout(timer);
                proc.kill();
                reject(new Error(msg.error.message || JSON.stringify(msg.error)));
              }
            }
          } else if (msg.id === 2) {
            if (Array.isArray(msg.result?.tools)) {
              toolsOk = true;
              finish();
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

    // Ignorer EPIPE hvis server-prosessen lukker stdin tidlig
    proc.stdin.on("error", () => {});

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
        clientInfo: { name: "mcp-smoke-test", version: "2.1" },
      },
    };
    safeWrite(initMsg);
  });
}

async function testServer(name, server) {
  const args = (server.args || []).map(resolveArg);
  const proc = spawn(server.command, args, { cwd: root, env: process.env });
  try {
    const { initOk, toolsOk } = await sendInitialize(proc);
    return { ok: initOk && toolsOk, initOk, toolsOk };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function sendToolCall(proc, id, name, args) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`tool call ${name} timed out after 30s`));
    }, 30000);

    function handler(data) {
      const lines = data.toString().split("\n").filter((line) => line.trim());
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          if (msg.id === id) {
            clearTimeout(timer);
            proc.stdout.off("data", handler);
            resolve(msg);
            return;
          }
        } catch {
          // ignore non-JSON lines
        }
      }
    }

    proc.stdout.on("data", handler);
    proc.stdin.write(JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name, arguments: args },
    }) + "\n");
  });
}

function parseToolResult(msg) {
  if (msg.error) throw new Error(msg.error.message || JSON.stringify(msg.error));
  const content = msg.result?.content;
  if (!Array.isArray(content) || content.length === 0) {
    throw new Error("tool result missing content");
  }
  const text = content[0].text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function testChromeSequence(name, server) {
  const args = (server.args || []).map(resolveArg);
  const env = { ...process.env, MCP_API_KEY: process.env.MCP_API_KEY || "smoke-test" };
  const proc = spawn(server.command, args, { cwd: root, env });

  try {
    const { initOk, toolsOk } = await sendInitialize(proc, { keepAlive: true });
    if (!initOk || !toolsOk) {
      return { ok: false, initOk, toolsOk, error: "initialize or tools/list failed" };
    }

    let id = 3;

    const start = parseToolResult(await sendToolCall(proc, id++, "chrome_start", { headless: true, profileMode: "clean" }));
    if (!start.ok) throw new Error("chrome_start failed: " + JSON.stringify(start));

    const navigate = parseToolResult(await sendToolCall(proc, id++, "chrome_navigate", { url: "https://www.klarpakke.no/no", waitUntil: "domcontentloaded" }));
    if (!navigate.ok) throw new Error("chrome_navigate failed: " + JSON.stringify(navigate));

    const snapshot = parseToolResult(await sendToolCall(proc, id++, "chrome_snapshot", {}));
    if (!snapshot.ok) throw new Error("chrome_snapshot failed: " + JSON.stringify(snapshot));
    if (!Array.isArray(snapshot.snapshot) || snapshot.snapshot.length === 0) {
      throw new Error("chrome_snapshot returned empty snapshot");
    }

    const screenshot = parseToolResult(await sendToolCall(proc, id++, "chrome_screenshot", {}));
    if (!screenshot.ok) throw new Error("chrome_screenshot failed: " + JSON.stringify(screenshot));
    if (!screenshot.base64 || typeof screenshot.base64 !== "string" || screenshot.base64.length < 100) {
      throw new Error("chrome_screenshot returned invalid base64 PNG");
    }

    const stop = parseToolResult(await sendToolCall(proc, id++, "chrome_stop", {}));
    if (!stop.ok) throw new Error("chrome_stop failed: " + JSON.stringify(stop));

    try { proc.stdin.end(); } catch { /* ignore */ }
    try { proc.kill("SIGTERM"); } catch { /* ignore */ }

    return { ok: true, initOk, toolsOk, chromeSequence: true };
  } catch (err) {
    try { proc.stdin.end(); } catch { /* ignore */ }
    try { proc.kill("SIGTERM"); } catch { /* ignore */ }
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
    const result = name === "chrome"
      ? await testChromeSequence(name, server)
      : await testServer(name, server);
    if (result.ok) {
      console.log("✅" + (result.chromeSequence ? " (chrome sequence)" : ""));
      passed++;
    } else {
      const detail = result.initOk && !result.toolsOk
        ? "tools/list failed"
        : result.error;
      console.log(`❌ (${detail})`);
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
