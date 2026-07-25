#!/usr/bin/env node
/**
 * guard-service-role-auth.mjs — KLA-auth pre-commit-guard.
 *
 * Bakgrunn (prod-bugs, r7-rapport 2026-07-25): createClient() i
 * @/lib/supabase/server er SERVICE-ROLE (ingen bruker-sesjon).
 * .auth.getUser()/.auth.getSession() paa den gir ALLTID null -> evig 401.
 * /api/klt/balance og /api/email/send la nede i prod pga. dette mønsteret.
 *
 * Regelen: En fil som importerer createClient fra @/lib/supabase/server
 * OG kaller .auth.getUser( / .auth.getSession( — UTEN å ogsaa bruke
 * createServerClient (dual-klient-mønsteret) — blokkeres.
 *
 * Riktig mønster (se /api/klt/balance/route.ts):
 *   - createServerClient (cookie-sesjon)  -> auth.getUser()
 *   - createClient (service-role)         -> KUN data, med eksplisitt
 *     .eq("user_id", user.id)-filter
 *
 * Kjoeres fra pre-commit paa stagede filer.
 * Manuell full-skan: node scripts/guard-service-role-auth.mjs --all
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ALLOWLIST_PATH = path.join(ROOT, "scripts/service-role-auth-allowlist.txt");
const FULL_SCAN = process.argv.includes("--all");

// Importer av service-role-klienten (ogsaa med alias: createClient as svc)
const SERVICE_IMPORT =
  /import\s*{[^}]*\bcreateClient\b[^}]*}\s*from\s*["']@\/lib\/supabase\/server["']/;
// Auth-kall som KREVER bruker-sesjon
const AUTH_CALL = /\.auth\.(getUser|getSession)\(/;
// Riktig mønster: session-klient er i bruk i samme fil
const SESSION_OK = /\bcreateServerClient\b/;

const SKIP = /(__tests__|\.test\.|\.spec\.|\.stories\.|\.md$|\.mdx$)/;

function stagedFiles() {
  const out = execSync("git diff --cached --name-only --diff-filter=ACM", {
    encoding: "utf8",
  });
  return out.split("\n").filter(Boolean);
}

function allSourceFiles() {
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

const allowlist = loadAllowlist();
const files = (FULL_SCAN ? allSourceFiles() : stagedFiles()).filter(
  (f) => /\.(ts|tsx)$/.test(f) && f.startsWith("src/") && !SKIP.test(f),
);

const brudd = [];
for (const file of files) {
  if (allowlist.has(file)) continue;
  if (!existsSync(path.join(ROOT, file))) continue;
  const content = readFileSync(path.join(ROOT, file), "utf8");
  if (SERVICE_IMPORT.test(content) && AUTH_CALL.test(content) && !SESSION_OK.test(content)) {
    brudd.push(file);
  }
}

if (brudd.length > 0) {
  console.error("");
  console.error("❌ Service-role auth-misbruk funnet! Commit blokkert.");
  console.error("");
  console.error("   createClient() i @/lib/supabase/server er SERVICE-ROLE og har");
  console.error("   ingen bruker-sesjon — .auth.getUser() gir alltid null (evig 401).");
  console.error("   Dette har lagt /api-klt/balance og /api/email/send nede i prod.");
  console.error("");
  for (const f of brudd) console.error("   - " + f);
  console.error("");
  console.error("   Slik fikser du det (dual-klient-mønsteret):");
  console.error('     import { createServerClient } from "@/lib/supabase/server";');
  console.error("     const supabase = await createServerClient();");
  console.error("     const { data: { user } } = await supabase.auth.getUser();");
  console.error("");
  console.error("   Service-klienten brukes KUN til data, alltid med");
  console.error('   eksplisitt .eq("user_id", user.id)-filter.');
  console.error("");
  console.error("   Dokumentert unntak? Legg filen i");
  console.error("   scripts/service-role-auth-allowlist.txt (med begrunnelse).");
  console.error("");
  process.exit(1);
}

console.log(
  `✅ Service-role auth guard OK (${files.length} filer sjekket${FULL_SCAN ? ", full-skan" : ""})`,
);
