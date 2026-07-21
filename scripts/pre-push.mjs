#!/usr/bin/env node

/**
 * Pre-Push Gate Runner — fast, conditional, parallel
 *
 * Default mode runs the lightest gates in parallel and skips expensive work
 * when nothing relevant changed. Use --full for a manual complete run.
 *
 * Flags:
 *   --full       Run every gate regardless of changed files.
 *   --smoke      Run the E2E smoke gate even when it would normally be skipped.
 *   --verbose    Print full command output for skipped gates.
 */

import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const args = new Set(process.argv.slice(2));
const FULL = args.has("--full");
const SMOKE = args.has("--smoke") || FULL;
const VERBOSE = args.has("--verbose");

let failed = false;
let totalTime = 0;

function logGate(num, name) {
  console.log(
    `\n${BOLD}═══════════════════════════════════════════════════════${RESET}`
  );
  console.log(`${BOLD}  GATE ${num}: ${name}${RESET}`);
  console.log(
    `${BOLD}═══════════════════════════════════════════════════════${RESET}\n`
  );
}

function fmtTime(ms) {
  return (ms / 1000).toFixed(1);
}

function git(args) {
  return new Promise((resolve) => {
    const child = spawn("git", args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => resolve({ code, out, err }));
  });
}

async function changedFiles() {
  // Try to get files changed since origin/main. If origin/main doesn't exist or
  // there is no remote, fall back to staged files and then to an empty list.
  const results = [];
  for (const args of [
    ["diff", "--name-only", "origin/main...HEAD"],
    ["diff", "origin/main...HEAD", "--name-only"],
    ["diff", "--name-only", "origin/main"],
    ["diff", "--cached", "--name-only"],
  ]) {
    const { code, out } = await git(args);
    if (code === 0) results.push(out.trim().split("\n").filter(Boolean));
  }
  const longest = results.reduce((a, b) => (a.length >= b.length ? a : b), []);
  return new Set(longest);
}

function changedSinceMain() {
  return changedFiles();
}

function exec(command, label, { inherit = true } = {}) {
  return new Promise((resolve) => {
    const start = performance.now();
    const [cmd, ...cmdArgs] = command.split(/\s+/);
    const child = spawn(cmd, cmdArgs, {
      cwd: process.cwd(),
      stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "1" },
      shell: process.platform === "win32",
    });
    let out = "";
    let err = "";
    if (!inherit) {
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (err += d));
    }
    child.on("close", (code) => {
      const elapsed = performance.now() - start;
      totalTime += elapsed;
      if (code === 0) {
        console.log(
          `${GREEN}✅ ${label} passed (${fmtTime(elapsed)}s)${RESET}\n`
        );
        resolve({ ok: true, out, err });
      } else {
        console.log(`${RED}❌ ${label} FAILED (${fmtTime(elapsed)}s)${RESET}\n`);
        resolve({ ok: false, out, err });
      }
    });
  });
}

function execSilent(command) {
  return exec(command, null, { inherit: false });
}

function anyMatch(files, patterns) {
  for (const f of files) {
    for (const p of patterns) {
      if (typeof p === "string") {
        if (f.startsWith(p)) return true;
      } else if (p.test(f)) {
        return true;
      }
    }
  }
  return false;
}

async function runGate1() {
  logGate(1, "Statisk analyse (parallel)");
  const [typeCheck, lint, i18n, i18nUsage] = await Promise.all([
    exec("npm run type-check", "Type check"),
    exec("npm run lint:gate", "Lint gate"),
    exec("npm run i18n:validate", "i18n validation"),
    exec("npm run i18n:usage", "i18n usage validation"),
  ]);

  if (!typeCheck.ok || !lint.ok || !i18n.ok || !i18nUsage.ok) {
    failed = true;
    return;
  }

  const files = await changedSinceMain();
  if (files.size && anyMatch(files, ["supabase/migrations"])) {
    const migration = await exec(
      "node scripts/validate-migrations.mjs --staged",
      "Migration validation"
    );
    if (!migration.ok) failed = true;
  } else {
    console.log(
      `${YELLOW}⚡ Skipping migration validation (no staged migrations)${RESET}\n`
    );
  }
}

async function runGate2(changedFiles) {
  logGate(2, "Unit-tester");

  const testFilePattern = /\.(test|spec)\.(ts|tsx|js|jsx)$/;
  const codeFilePattern = /\.(ts|tsx|js|jsx)$/;
  const relevant = [...changedFiles].filter(
    (f) => testFilePattern.test(f) || codeFilePattern.test(f)
  );

  if (FULL || relevant.length > 0) {
    const result = await exec(
      "npx vitest run --changed origin/main",
      "Changed unit tests"
    );
    if (!result.ok) failed = true;
  } else {
    console.log(
      `${YELLOW}⚡ No changed test/source files; running minimal smoke test${RESET}\n`
    );
    const result = await exec("npm run test:smoke", "Smoke test");
    if (!result.ok) failed = true;
  }
}

async function runGate3(changedFiles) {
  logGate(3, "Build");

  const buildPatterns = [
    "package.json",
    "package-lock.json",
    /^next\.config\./,
    /^wrangler\.jsonc/,
    /^open-next\.config\./,
    /^tsconfig\.json/,
  ];

  if (FULL || anyMatch(changedFiles, buildPatterns)) {
    const result = await exec(
      "npm run cf:build",
      "Cloudflare build"
    );
    if (!result.ok) failed = true;
  } else {
    console.log(
      `${YELLOW}⚡ Skipping Cloudflare build (no relevant source/config changes)${RESET}\n`
    );
  }
}

async function runGate4(changedFiles) {
  logGate(4, "Mobil fast-check");

  const mobilePatterns = [
    "src/shared/ui",
    "src/app",
    "src/hooks",
    "src/features",
    "public/",
  ];

  if (FULL || anyMatch(changedFiles, mobilePatterns)) {
    const result = await exec(
      "node scripts/mobile-fast-check.mjs",
      "Mobile fast-check"
    );
    if (!result.ok) failed = true;
  } else {
    console.log(
      `${YELLOW}⚡ Skipping mobile fast-check (no mobile-relevant changes)${RESET}\n`
    );
  }
}

async function runGate5(changedFiles) {
  logGate(5, "E2E Smoke");

  const e2ePatterns = [
    "e2e/",
    "playwright.config",
  ];

  if (SMOKE || anyMatch(changedFiles, e2ePatterns)) {
    console.log(
      `${CYAN}ℹ️ Running E2E smoke (use --smoke to force, omit to skip)${RESET}\n`
    );
    const result = await exec(
      "npm run test:e2e:smoke",
      "E2E smoke"
    );
    if (!result.ok) failed = true;
  } else {
    console.log(
      `${YELLOW}⚡ Skipping E2E smoke (use --smoke to force)${RESET}\n`
    );
  }
}

async function main() {
  console.log(
    `${BOLD}🚀 Klarpakke Pre-Push Gates${RESET}`
  );
  console.log(
    `${YELLOW}   Fast-fail | conditional gates | ${
      FULL ? "FULL mode" : "default mode"
    }${RESET}\n`
  );

  const changedFiles = await changedSinceMain();
  if (VERBOSE) {
    console.log(
      `${DIM}Changed files: ${[...changedFiles].join(", ") || "(none)"}${RESET}\n`
    );
  }

  await runGate1();
  if (!failed) await runGate2(changedFiles);
  if (!failed) await runGate3(changedFiles);
  if (!failed) await runGate4(changedFiles);
  if (!failed) await runGate5(changedFiles);

  console.log(
    `${BOLD}═══════════════════════════════════════════════════════${RESET}`
  );
  if (failed) {
    console.log(`${RED}${BOLD}  ❌ PRE-PUSH FAILED${RESET}`);
    console.log(
      `${RED}  Fiks feilen og kjør på nytt: npm run pre-push${RESET}`
    );
    console.log(
      `${BOLD}═══════════════════════════════════════════════════════${RESET}\n`
    );
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}  ✅ ALL GATES PASSED${RESET}`);
    console.log(`${GREEN}  Tid: ${fmtTime(totalTime)}s${RESET}`);
    console.log(`${GREEN}  Klar for push!${RESET}`);
    console.log(
      `${BOLD}═══════════════════════════════════════════════════════${RESET}\n`
    );
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`${RED}Unexpected pre-push error:${RESET}`, err);
  process.exit(1);
});
