#!/usr/bin/env node
/**
 * Verifikasjon: Ingen page.tsx under src/app/ skal bruke redirect() for auth-guarding.
 * 
 * Guard-as-Render pattern krever at uautentiserte brukere rendrer en LoginRequired-komponent
 * istedenfor å bli redirectet med 307. Vercel edge cacher 307-redirects i 1 time uansett
 * Cache-Control headers, noe som bryter auth-flow.
 * 
 * Kjør: node scripts/verify-no-auth-redirects.mjs
 * Eller: npm run verify:auth-redirects (legg til i package.json)
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(__dirname, "..", "src", "app");

const ALLOWED_REDIRECT_PATTERNS = [
  // Sanity studio redirect
  /studio\/\[\[\.\.\.tool\]\]/,
  // Auth callback error redirects
  /\(auth\)\/callback/,
];

function* walkDir(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      yield* walkDir(fullPath);
    } else if (stat.isFile() && entry === "page.tsx") {
      yield fullPath;
    }
  }
}

function isAllowed(path) {
  return ALLOWED_REDIRECT_PATTERNS.some((p) => p.test(path));
}

let violations = 0;

for (const filePath of walkDir(APP_DIR)) {
  if (isAllowed(filePath)) continue;

  const content = readFileSync(filePath, "utf-8");

  // Sjekk om filen importerer redirect fra next/navigation
  const hasRedirectImport = /import\s+{[^}]*\bredirect\b[^}]*}\s+from\s+["']next\/navigation["']/.test(content);
  if (!hasRedirectImport) continue;

  // Sjekk om redirect brukes med login/innlogging (auth-guard pattern)
  const hasAuthRedirect = /redirect\s*\([^)]*(?:login|innlogging)/.test(content);
  if (!hasAuthRedirect) continue;

  // Sjekk om filen allerede bruker LoginRequired (da er det kanskje en gammel redirect som er igjen)
  const hasLoginRequired = content.includes("LoginRequired");

  const relativePath = filePath.replace(join(__dirname, ".."), "");
  console.error(`❌ ${relativePath}`);
  console.error(`   Bruker redirect() for auth-guarding. Bruk LoginRequired istedenfor.`);
  if (hasLoginRequired) {
    console.error(`   MERK: Filen importerer LoginRequired men bruker fortsatt redirect().`);
  }
  violations++;
}

if (violations > 0) {
  console.error(`\n🚫 ${violations} fil(er) bryter Guard-as-Render pattern.`);
  console.error(`   Se src/shared/ui/LoginRequired.tsx for korrekt implementasjon.\n`);
  process.exit(1);
} else {
  console.log("✅ Ingen auth-redirects funnet. Guard-as-Render pattern overholdes.");
  process.exit(0);
}
