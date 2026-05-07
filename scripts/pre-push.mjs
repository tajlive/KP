#!/usr/bin/env node

/**
 * Pre-Push Gate Runner
 * Kjører alle 5 gates sekvensielt. Feiler hardt ved første feil.
 * Maks tid: ~8 minutter.
 *
 * Usage: npm run pre-push
 */

import { execSync } from "child_process";
import { performance } from "perf_hooks";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let failed = false;
let totalTime = 0;

function logGate(num, name) {
  console.log(`\n${BOLD}═══════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  GATE ${num}: ${name}${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════${RESET}\n`);
}

function run(cmd, label) {
  const start = performance.now();
  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
    const elapsed = ((performance.now() - start) / 1000).toFixed(1);
    totalTime += parseFloat(elapsed);
    console.log(`\n${GREEN}✅ ${label} passed (${elapsed}s)${RESET}\n`);
    return true;
  } catch (err) {
    const elapsed = ((performance.now() - start) / 1000).toFixed(1);
    totalTime += parseFloat(elapsed);
    console.log(`\n${RED}❌ ${label} FAILED (${elapsed}s)${RESET}\n`);
    return false;
  }
}

console.log(`${BOLD}🚀 Klarpakke Pre-Push Gates${RESET}`);
console.log(`${YELLOW}   Maks ~8 min | Feil = STOP${RESET}\n`);

// ── GATE 1: Statisk analyse ───────────────────────────────
logGate(1, "Statisk analyse");
if (!run("npx tsc --noEmit", "Type check")) failed = true;
if (!failed && !run("npm run lint:gate", "Lint gate")) failed = true;
if (!failed && !run("npm run i18n:validate", "i18n validation")) failed = true;
if (!failed) {
  try {
    execSync("git diff --cached --name-only", { stdio: "pipe" });
    const staged = execSync("git diff --cached --name-only", { encoding: "utf8" });
    if (staged.includes("supabase/migrations")) {
      if (!run("node scripts/validate-migrations.mjs --staged", "Migration validation")) failed = true;
    } else {
      console.log(`${YELLOW}⚡ Skipping migration validation (no staged migrations)${RESET}\n`);
    }
  } catch {
    // Not a git repo or no staged files — skip migration check
    console.log(`${YELLOW}⚡ Skipping migration validation (not in git context)${RESET}\n`);
  }
}

// ── GATE 2: Unit-tester ───────────────────────────────────
if (!failed) {
  logGate(2, "Unit-tester");
  if (!run("npm run test:unit", "Unit tests")) failed = true;
}

// ── GATE 3: Build ─────────────────────────────────────────
if (!failed) {
  logGate(3, "Build");
  if (!run("SKIP_LINT_IN_BUILD=true npm run build", "Production build")) failed = true;
}

// ── GATE 4: Mobil fast-check ──────────────────────────────
if (!failed) {
  logGate(4, "Mobil fast-check");
  if (!run("node scripts/mobile-fast-check.mjs", "Mobile audit")) failed = true;
}

// ── GATE 5: E2E Smoke (valgfritt, lang) ───────────────────
if (!failed) {
  logGate(5, "E2E Smoke (valgfritt)");
  console.log(`${YELLOW}   Tips: Kjør 'npm run test:e2e:smoke' separat hvis du har tid.${RESET}`);
  console.log(`${YELLOW}   Hoppes over i pre-push for å holde tiden < 8 min.${RESET}\n`);
}

// ── Summary ───────────────────────────────────────────────
console.log(`${BOLD}═══════════════════════════════════════════════════════${RESET}`);
if (failed) {
  console.log(`${RED}${BOLD}  ❌ PRE-PUSH FAILED${RESET}`);
  console.log(`${RED}  Fiks feilen og kjør på nytt: npm run pre-push${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════${RESET}\n`);
  process.exit(1);
} else {
  console.log(`${GREEN}${BOLD}  ✅ ALL GATES PASSED${RESET}`);
  console.log(`${GREEN}  Tid: ${totalTime.toFixed(1)}s${RESET}`);
  console.log(`${GREEN}  Klar for push!${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════${RESET}\n`);
  process.exit(0);
}
