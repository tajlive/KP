#!/usr/bin/env node
/**
 * Fiks labelsett på KLA-261 og KLA-262 — komplett sett i ÉN update hver
 * (forrige sesjon la til labels én-om-gangen, som ERSTATTET settet hver gang).
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");
const env = { ...process.env };
for (const line of readFileSync(resolve(root, ".env.local"), "utf8").split("\n")) {
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
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    } catch {}
  }
});

function call(method, params = {}) {
  const id = nextId++;
  return new Promise((r) => {
    pending.set(id, r);
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

const tool = async (name, args = {}) => {
  const res = await call("tools/call", { name, arguments: args });
  return JSON.parse(res.result?.content?.[0]?.text ?? "{}");
};

async function main() {
  await call("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "fixlabels", version: "1.0" } });

  const fixes = [
    { identifier: "KLA-261", labels: ["p1", "incident", "paper-trading", "balance", "database", "regression-test-required"] },
    { identifier: "KLA-262", labels: ["p1", "ux", "ui", "copy", "a11y", "routing", "api", "mobile", "needs-tom-approval"] },
  ];

  for (const fix of fixes) {
    const res = await tool("linear_update_issue", fix);
    console.log(`${fix.identifier}:`, res.success ? "OK" : "FAIL", res.error ?? "");
  }

  // Verifiser
  for (const id of ["KLA-261", "KLA-262"]) {
    const iss = await tool("linear_get_issue", { identifier: id });
    const names = (iss.labels?.nodes ?? []).map((l) => l.name).join(",");
    console.log(`VERIFY ${id}: ${names}`);
  }

  child.kill();
  process.exit(0);
}
main().catch((e) => { console.error("FAIL:", e.message); child.kill(); process.exit(1); });
