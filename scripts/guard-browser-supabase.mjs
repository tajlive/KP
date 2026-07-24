#!/usr/bin/env node
/**
 * guard-browser-supabase.mjs — KLA-auth pre-commit-guard.
 *
 * Bakgrunn: browser-supabase-klienten er ALLTID anon (httpOnly sb-cookie).
 * `.from()`/`.channel()` i "use client"-filer bryter stille pga RLS
 * (0 rader / 0 events). Bruker-data skal hentes via /api-ruter
 * (createServerClient + getUser, service med eksplisitt user_id-filter).
 *
 * Denne guarden blokkerer NYE "use client"-filer med .from()/.channel().
 * Eksisterende kjente filer staar i scripts/browser-supabase-allowlist.txt
 * og skal krympes over tid — aldri vokse.
 *
 * Kjoeres fra pre-commit-hooken paa stagede filer.
 * Manuell full-skan: node scripts/guard-browser-supabase.mjs --all
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ALLOWLIST_PATH = path.join(ROOT, "scripts/browser-supabase-allowlist.txt");

// Matcher supabase .from('tabell') / .channel('navn') — IKKE Array.from(
const PATTERN = /\.from\(['"]|\.channel\(['"]/;

function getStagedFiles() {
  const out = execSync("git diff --cached --name-only --diff-filter=ACM", {
    encoding: "utf8",
  });
  return out.split("\n").filter(Boolean);
}

function getAllSourceFiles() {
  const out = execSync(
    "git ls-files 'src/**/*.ts' 'src/**/*.tsx'",
    { encoding: "utf8" },
  );
  return out.split("\n").filter(Boolean);
}

function loadAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) return new Set();
  return new Set(
    readFileSync(ALLOWLIST_PATH, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#")),
  );
}

function isClientComponent(content) {
  // "use client" maa vaere oeverst (foerste ikke-tomme/kommentar-linjer)
  const head = content.slice(0, 400);
  return /^["']use client["']/m.test(head);
}

const modeAll = process.argv.includes("--all");
const files = modeAll ? getAllSourceFiles() : getStagedFiles();
const allowlist = loadAllowlist();

const violations = [];

for (const file of files) {
  if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
  if (file.startsWith("src/app/api/")) continue; // server-ruter er OK
  if (!existsSync(path.join(ROOT, file))) continue;

  const content = readFileSync(path.join(ROOT, file), "utf8");
  if (!isClientComponent(content)) continue;
  if (!PATTERN.test(content)) continue;
  if (allowlist.has(file)) continue;

  violations.push(file);
}

if (violations.length > 0) {
  console.error(
    "\n❌ KLA-auth-guard: browser-supabase .from()/.channel() i 'use client'-filer:\n",
  );
  for (const v of violations) console.error(`   - ${v}`);
  console.error(`
Browser-supabase er ALLTID anon (httpOnly sb-cookie) — RLS gir stille
0 rader/0 events. Bruk en /api-route i stedet (se .hermes.md).

Eksisterende unntak staar i scripts/browser-supabase-allowlist.txt.
Legg IKKE til nye filer der uten eksplisitt arkitekt-beslutning.
`);
  process.exit(1);
}

if (modeAll) {
  // Rapporter allowlist-helsa ved full skan
  const stillUsed = [...allowlist].filter((f) => {
    const p = path.join(ROOT, f);
    if (!existsSync(p)) return false;
    const c = readFileSync(p, "utf8");
    return isClientComponent(c) && PATTERN.test(c);
  });
  const stale = [...allowlist].filter((f) => !stillUsed.includes(f));
  console.log(
    `✅ KLA-auth-guard OK. Allowlist: ${stillUsed.length} aktive, ${stale.length} kan fjernes.`,
  );
  for (const s of stale) console.log(`   (stale) ${s}`);
}
process.exit(0);
