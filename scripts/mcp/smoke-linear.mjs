#!/usr/bin/env node
/**
 * Smoketest for Linear MCP — initialiserer stdio-forbindelsen,
 * lister verktøy og kaller linear_viewer + linear_teams.
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");

// Last LINEAR_API_KEY fra .env.local
const env = { ...process.env };
const envLocal = readFileSync(resolve(root, ".env.local"), "utf8");
for (const line of envLocal.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const child = spawn(process.execPath, [resolve(__dirname, "dist", "linear-mcp.js")], {
  env,
  stdio: ["pipe", "pipe", "inherit"],
});

let buf = "";
const pending = new Map();
let nextId = 1;

child.stdout.on("data", (chunk) => {
  buf += chunk.toString();
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id && pending.has(msg.id)) {
        const { resolve: r, label } = pending.get(msg.id);
        pending.delete(msg.id);
        r({ label, msg });
      }
    } catch {}
  }
});

function call(method, params = {}) {
  const id = nextId++;
  return new Promise((resolveFn) => {
    pending.set(id, { resolve: resolveFn, label: method });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

async function main() {
  const init = await call("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "smoke", version: "1.0" },
  });
  console.log("INIT:", init.msg.result?.serverInfo?.name, init.msg.result?.serverInfo?.version);

  const tools = await call("tools/list", {});
  const names = tools.msg.result?.tools?.map((t) => t.name) ?? [];
  console.log("TOOLS:", names.length, names.join(", "));

  const viewer = await call("tools/call", { name: "linear_viewer", arguments: {} });
  const v = JSON.parse(viewer.msg.result?.content?.[0]?.text ?? "{}");
  console.log("VIEWER:", v.name, v.email);

  const teams = await call("tools/call", { name: "linear_teams", arguments: {} });
  const t = JSON.parse(teams.msg.result?.content?.[0]?.text ?? "[]");
  console.log("TEAMS:", t.map((x) => `${x.name} (${x.key})`).join(", "));

  child.kill();
  process.exit(0);
}

main().catch((e) => {
  console.error("SMOKE FAIL:", e.message);
  child.kill();
  process.exit(1);
});
