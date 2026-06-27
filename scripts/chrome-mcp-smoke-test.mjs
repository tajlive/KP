#!/usr/bin/env node
/**
 * Smoke test for Chrome Control MCP server.
 * Starts the server via stdio, calls chrome_get_info, chrome_start, chrome_navigate,
 * chrome_snapshot, chrome_stop, then exits.
 *
 * Usage:
 *   node scripts/chrome-mcp-smoke-test.mjs
 *   node scripts/chrome-mcp-smoke-test.mjs --copy
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const useCopy = process.argv.includes("--copy");
const headless = !process.argv.includes("--headed");

const env = { ...process.env };
// Ensure MCP_API_KEY is set for the wrapper if needed; the server only warns.
if (!env.MCP_API_KEY) env.MCP_API_KEY = "smoke-test";

const playwrightModulePath = resolve(root, "node_modules", "playwright");
if (!existsSync(playwrightModulePath)) {
  console.error("❌ Playwright not installed");
  process.exit(1);
}

const serverPath = resolve(root, "scripts/chrome-mcp-server.mjs");
const child = spawn("node", [serverPath], { env, stdio: ["pipe", "pipe", "inherit"] });

let requestId = 1;
const pending = new Map();

function send(method, params) {
  return new Promise((resolve, reject) => {
    const id = requestId++;
    const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
    pending.set(id, { resolve, reject });
    child.stdin.write(msg);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let buffer = "";
child.stdout.on("data", (data) => {
  buffer += data.toString();
  let lines = buffer.split("\n");
  buffer = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id && pending.has(msg.id)) {
        const { resolve } = pending.get(msg.id);
        pending.delete(msg.id);
        resolve(msg);
      }
    } catch (err) {
      console.error("[parse error]", line.slice(0, 200));
    }
  }
});

async function run() {
  try {
    console.log("🧪 Chrome MCP smoke test starting...");
    console.log(`Mode: ${useCopy ? "copy" : "clean"}, headless: ${headless}`);

    const init = await send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "smoke-test", version: "1.0.0" },
    });
    console.log("Initialize:", init.result ? "OK" : JSON.stringify(init));

    await send("initialized", {});

    const info = await send("tools/call", { name: "chrome_get_info", arguments: {} });
    console.log("\nchrome_get_info result:");
    console.log(JSON.parse(info.result.content[0].text));

    const start = await send("tools/call", {
      name: "chrome_start",
      arguments: { headless, profileMode: useCopy ? "copy" : "clean" },
    });
    console.log("\nchrome_start result:");
    console.log(JSON.parse(start.result.content[0].text));

    if (start.result.isError) {
      throw new Error("chrome_start failed");
    }

    const nav = await send("tools/call", {
      name: "chrome_navigate",
      arguments: { url: "https://www.klarpakke.no/no", waitUntil: "domcontentloaded" },
    });
    console.log("\nchrome_navigate result:");
    console.log(JSON.parse(nav.result.content[0].text));

    const snap = await send("tools/call", { name: "chrome_snapshot", arguments: {} });
    const snapResult = JSON.parse(snap.result.content[0].text);
    console.log("\nchrome_snapshot result:");
    console.log({ title: snapResult.title, url: snapResult.url, nodes: snapResult.snapshot?.length });

    const stop = await send("tools/call", { name: "chrome_stop", arguments: {} });
    console.log("\nchrome_stop result:");
    console.log(JSON.parse(stop.result.content[0].text));

    console.log("\n✅ Smoke test completed successfully");
  } catch (err) {
    console.error("\n❌ Smoke test failed:", err.message);
    try {
      child.kill("SIGTERM");
    } catch {
      // ignore
    }
    process.exit(1);
  } finally {
    child.stdin.end();
    await sleep(500);
    child.kill("SIGTERM");
  }
}

run();
