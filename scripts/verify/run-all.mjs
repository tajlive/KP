#!/usr/bin/env node
/**
 * Run All Verification Checks — Post-change verification suite.
 *
 * Usage:
 *   node scripts/verify/run-all.mjs
 *
 * This runs:
 *   1. verify-claims.mjs — Check that redirects/routes match claims
 *   2. check-stale-types.mjs — Verify no stale .next/types references
 *   3. npm run lint — ESLint check
 *   4. npm run type-check — TypeScript check
 *   5. npm run test:unit — Unit tests
 */

import { execSync } from "child_process";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

let exitCode = 0;

function runStep(name, command) {
  console.log(`\n${BOLD}${"=".repeat(60)}${RESET}`);
  console.log(`${BOLD}Step: ${name}${RESET}`);
  console.log(`${BOLD}${"=".repeat(60)}${RESET}\n`);

  try {
    execSync(command, { stdio: "inherit", cwd: "/Users/taj/klarpakke" });
    console.log(`\n${GREEN}✓${RESET} ${name} passed`);
    return true;
  } catch {
    console.log(`\n${RED}✗${RESET} ${name} failed`);
    exitCode = 1;
    return false;
  }
}

console.log(`${BOLD}Klarpakke Post-Change Verification Suite${RESET}`);
console.log(`Run this after making changes, before committing.\n`);

// Step 0: Honcho health
runStep("Honcho Health", "node scripts/verify-honcho.mjs");

// Step 1: Claims verification
runStep("Verify Claims", "node scripts/verify/verify-claims.mjs");

// Step 2: Stale types
runStep("Stale Type Cache", "node scripts/verify/check-stale-types.mjs");

// Step 3: Lint
runStep("ESLint", "npm run lint");

// Step 4: Type check
runStep("TypeScript", "npm run type-check");

// Step 5: Unit tests
runStep("Unit Tests", "npm run test:unit");

console.log(`\n${BOLD}${"=".repeat(60)}${RESET}`);
if (exitCode === 0) {
  console.log(`${GREEN}${BOLD}All verification steps passed ✓${RESET}`);
  console.log(`${GREEN}Safe to commit.${RESET}`);
} else {
  console.log(`${RED}${BOLD}Some verification steps failed ✗${RESET}`);
  console.log(`${RED}Fix issues before committing.${RESET}`);
}
console.log(`${BOLD}${"=".repeat(60)}${RESET}\n`);

process.exit(exitCode);
