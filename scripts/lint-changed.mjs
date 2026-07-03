#!/usr/bin/env node
/**
 * Lint only changed JS/TS files compared to origin/main and the working tree.
 * Combines files from origin/main...HEAD (already-committed changes) and
 * git diff --name-only HEAD (uncommitted working-tree changes).
 * Falls back to HEAD~1 if origin/main is not available.
 * Exits 0 if no JS/TS files changed.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

function runGit(args) {
  const result = spawnSync("git", args, { encoding: "utf-8", shell: false });
  if (result.status !== 0) {
    return { ok: false, output: "", error: result.stderr || "" };
  }
  return { ok: true, output: result.stdout || "", error: "" };
}

function getChangedFiles() {
  const files = new Set();

  // 1. Already-committed changes since origin/main (pre-push gate)
  const committed = runGit([
    "diff",
    "--name-only",
    "--diff-filter=ACMRT",
    "origin/main...HEAD",
  ]);
  if (committed.ok) {
    committed.output.split("\n").forEach((line) => files.add(line.trim()));
  } else {
    console.warn("⚠️  git diff origin/main...HEAD failed, falling back to HEAD~1");
    const fallback = runGit(["diff", "--name-only", "--diff-filter=ACMRT", "HEAD~1"]);
    if (!fallback.ok) {
      console.error("❌ Failed to compute changed files:");
      console.error(fallback.error || committed.error);
      process.exit(1);
    }
    fallback.output.split("\n").forEach((line) => files.add(line.trim()));
  }

  // 2. Uncommitted working-tree changes (pre-commit local check)
  const workingTree = runGit(["diff", "--name-only", "--diff-filter=ACMRT", "HEAD"]);
  if (workingTree.ok) {
    workingTree.output.split("\n").forEach((line) => files.add(line.trim()));
  }

  // 3. Staged changes (git diff --cached)
  const staged = runGit(["diff", "--cached", "--name-only", "--diff-filter=ACMRT"]);
  if (staged.ok) {
    staged.output.split("\n").forEach((line) => files.add(line.trim()));
  }

  return Array.from(files).join("\n");
}

function hasJsTsExtension(file) {
  const lower = file.toLowerCase();
  return EXTENSIONS.has(lower.slice(lower.lastIndexOf(".")));
}

const changed = getChangedFiles()
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && hasJsTsExtension(line) && existsSync(line));

if (changed.length === 0) {
  console.log("✅ No changed JS/TS files to lint.");
  process.exit(0);
}

console.log(`🔍 Linting ${changed.length} changed file(s)...`);

const result = spawnSync(
  "npx",
  ["eslint", "--max-warnings", "0", "--no-warn-ignored", "--cache", ...changed],
  { stdio: "inherit", shell: false }
);

process.exit(result.status ?? 1);
