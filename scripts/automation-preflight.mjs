#!/usr/bin/env node
/**
 * Preflight for maksimal lok automasjon (MCP/CLI-forutsetninger).
 * Kjør fra repo-rot: npm run auto:preflight | auto:preflight:full
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

function run(label, command, args, options = {}) {
  console.log(`\n── ${label} ──`);
  const r = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, ...options.env },
    ...options,
  });
  const code = r.status ?? 1;
  if (code !== 0) {
    console.error(`\n❌ ${label} feilet (exit ${code})`);
  }
  return code;
}

const full = process.argv.includes("--full");
/** `preflight` = MCP. Streng: `CLOUD_READINESS_PROFILE=agent` eller `npm run cloud:ready`. */
const readinessProfile =
  process.env.CLOUD_READINESS_PROFILE || "preflight";

let code = run(
  `Cloud readiness (${readinessProfile})`,
  "node",
  ["scripts/cloud-readiness.mjs", "--profile", readinessProfile],
);
if (code !== 0) process.exit(code);

code = run("MCP config (.cursor ↔ .mcp)", "node", ["scripts/validate-mcp-config.mjs"]);
if (code !== 0) process.exit(code);

if (full) {
  code = run("MCP connection tests", "bash", ["scripts/test-mcp-connections.sh"]);
  if (code !== 0) {
    console.error("Se scripts/mcp-test-report.txt for detaljer.");
    process.exit(code);
  }
}

console.log("\n✅ Preflight fullført.");
console.log("   Playbook: docs/FULL-AUTOMATION-PLAYBOOK.md");
if (!full) {
  console.log("   Utvidet sjekk: npm run auto:preflight:full");
}
process.exit(0);
