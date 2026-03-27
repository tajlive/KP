#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const strict = process.argv.includes("--strict");

const result = spawnSync("supabase", ["db", "lint", "--linked"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

const output = `${result.stdout || ""}\n${result.stderr || ""}`;
const jsonStart = output.indexOf("[");
const jsonEnd = output.lastIndexOf("]");

let report = [];
if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
  const jsonText = output.slice(jsonStart, jsonEnd + 1);
  try {
    report = JSON.parse(jsonText);
  } catch {
    console.error("❌ Kunne ikke parse db lint JSON-output.");
    process.exit(1);
  }
}

const isIgnored = (fnName, issue) => {
  if (fnName !== "extensions.index_advisor") return false;
  const msg = String(issue?.message || "");
  if (msg.includes("hypopg_reset() does not exist")) return true;
  if (msg.includes("target type is different type than source type")) return true;
  return false;
};

const remaining = [];
let ignoredCount = 0;

for (const item of report) {
  const fnName = item.function || "unknown";
  for (const issue of item.issues || []) {
    if (isIgnored(fnName, issue)) {
      ignoredCount += 1;
      continue;
    }
    remaining.push({ fnName, issue });
  }
}

const errors = remaining.filter((x) => x.issue.level === "error");
const warnings = remaining.filter((x) => x.issue.level === "warning");
const hasBlocking = errors.length > 0 || (strict && warnings.length > 0);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

console.log(
  `\n[db-lint-gate] ignored=${ignoredCount} errors=${errors.length} warnings=${warnings.length} strict=${strict}`,
);

if (hasBlocking) {
  console.error("\n❌ db-lint-gate: Blocking issues after allowlist:");
  for (const { fnName, issue } of remaining) {
    if (issue.level === "error" || (strict && issue.level === "warning")) {
      console.error(`- ${fnName}: [${issue.level}] ${issue.message}`);
    }
  }
  process.exit(1);
}

console.log("✅ db-lint-gate: pass");
process.exit(0);
