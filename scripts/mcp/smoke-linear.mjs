#!/usr/bin/env node
/**
 * Smoketest for Linear MCP — initialiserer stdio-forbindelsen,
 * lister verktøy og kaller read-only-verktøyene:
 * linear_viewer, linear_teams, linear_workflows, linear_get_issue.
 *
 * KUN read-only-kall — ingen create/update/comment/transition/archive.
 * Spawner wrapperen run-linear-mcp.mjs (samme vei som Hermes MCP bruker).
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

// Wrapperen (run-linear-mcp.mjs) laster selv .env.local og spawner dist —
// dette er den EKSAKTE kjøreveien Hermes bruker via mcp_servers.linear.
const child = spawn(process.execPath, [resolve(__dirname, "run-linear-mcp.mjs")], {
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

// KUN read-only-verktøy tillatt i smoke — guard mot skriveoperasjoner.
const READ_ONLY_TOOLS = new Set([
  "linear_viewer",
  "linear_teams",
  "linear_workflows",
  "linear_labels",
  "linear_projects",
  "linear_search_issues",
  "linear_get_issue",
]);
const calledTools = [];

async function callTool(name, args = {}) {
  if (!READ_ONLY_TOOLS.has(name)) {
    throw new Error(`SMOKE SIKKERHETSBRUDD: forsøkte å kalle «${name}» — ikke read-only`);
  }
  calledTools.push(name);
  const res = await call("tools/call", { name, arguments: args });
  // call() i smoke resolter {label, msg} — resultatet ligger i msg.result.
  return JSON.parse(res.msg?.result?.content?.[0]?.text ?? "{}");
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

  const v = await callTool("linear_viewer");
  console.log("VIEWER:", v.name);

  const teams = await callTool("linear_teams");
  console.log("TEAMS:", teams.map((x) => `${x.name} (${x.key})`).join(", "));
  if (!teams.some((t) => t.key === "KLA")) {
    throw new Error("SMOKE FAIL: team KLA ikke funnet");
  }
  console.log("ASSERT: team KLA finnes ✅");

  const workflows = await callTool("linear_workflows");
  const stateNames = (workflows ?? []).map((s) => s.name);
  if (workflows.length === 0 || stateNames.length === 0) {
    throw new Error("SMOKE FAIL: ingen workflow states lesbare");
  }
  console.log("WORKFLOW-STATES:", stateNames.join(" → "));

  const issue = await callTool("linear_get_issue", { identifier: "KLA-261" });
  if (!issue.identifier) {
    throw new Error("SMOKE FAIL: KLA-261 ikke lesbar");
  }
  console.log("ISSUE:", issue.identifier, "|", issue.state?.name ?? "?", "|", issue.title?.slice(0, 60));

  console.log("WRITE-OPS: 0 (kun read-only kalt:", [...calledTools].join(", "), ")");
  child.kill();
  process.exit(0);
}

main().catch((e) => {
  console.error("SMOKE FAIL:", e.message);
  child.kill();
  process.exit(1);
});
