#!/usr/bin/env node
/**
 * Lint only changed JS/TS files compared to origin/main.
 * Falls back to HEAD~1 if origin/main is not available.
 * Exits 0 if no JS/TS files changed.
 */
import { spawnSync } from "node:child_process";

const EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

function getChangedFiles() {
  const primary = spawnSync(
    "git",
    ["diff", "--name-only", "--diff-filter=ACMRT", "origin/main...HEAD"],
    { encoding: "utf-8", shell: false }
  );

  if (primary.status === 0) {
    return primary.stdout;
  }

  console.warn("⚠️  git diff origin/main...HEAD failed, falling back to HEAD~1");

  const fallback = spawnSync(
    "git",
    ["diff", "--name-only", "--diff-filter=ACMRT", "HEAD~1"],
    { encoding: "utf-8", shell: false }
  );

  if (fallback.status !== 0) {
    console.error("❌ Failed to compute changed files:");
    console.error(fallback.stderr || primary.stderr);
    process.exit(1);
  }

  return fallback.stdout;
}

function hasJsTsExtension(file) {
  const lower = file.toLowerCase();
  return EXTENSIONS.has(lower.slice(lower.lastIndexOf(".")));
}

const changed = getChangedFiles()
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && hasJsTsExtension(line));

if (changed.length === 0) {
  console.log("✅ No changed JS/TS files to lint.");
  process.exit(0);
}

console.log(`🔍 Linting ${changed.length} changed file(s)...`);

const result = spawnSync(
  "npx",
  ["eslint", "--max-warnings", "0", "--cache", ...changed],
  { stdio: "inherit", shell: false }
);

process.exit(result.status ?? 1);
