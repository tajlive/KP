#!/usr/bin/env node
/**
 * Secret Scanner — CI-inngang (KLA-276 Fase 5).
 * Delegaterer til scripts/arch/secret-audit.mjs. Kun metadata-output i --json/--check.
 * Bruk: node scripts/security/secret-audit.mjs [--check]
 */
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const audit = resolve(__dirname, "..", "arch", "secret-audit.mjs");
const args = process.argv.slice(2).filter((a) => a !== "--config");

try {
  execFileSync("node", [audit, ...args, ...(args.length === 0 ? [] : [])], {
    stdio: "inherit",
  });
} catch (err) {
  // secret-audit har allerede skrevet metadata; exit-kode videreføres (CI-gate).
  process.exit(err.status ?? 1);
}
