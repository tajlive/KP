#!/usr/bin/env node
/**
 * db-status-gate.mjs
 *
 * Kjører `supabase db status --linked` og parser output.
 * Allowlister kjente legacy-migrasjoner (f.eks. 999_fix_materialized_view).
 * Exit(1) hvis ukjente migrasjons-issues funnet.
 *
 * Bruk:
 *   node scripts/db-status-gate.mjs
 *   node scripts/db-status-gate.mjs --strict  # exit(1) selv på allowlisted
 */

import { spawnSync } from "node:child_process";

const strict = process.argv.includes("--strict");

// Allowlist patterns for legacy/known migrations
const ALLOWLIST_PATTERNS = [
  /999_fix_materialized_view/,
  /999.*placeholder/i,
];

const isAllowlisted = (text) => {
  const str = String(text || "");
  return ALLOWLIST_PATTERNS.some((pattern) => pattern.test(str));
};

// Fritekst-mønstre som indikerer ekte mismatch (ikke bare tabell-format)
const MISMATCH_PATTERNS = [
  /Found local migration files not applied on remote/i,
  /not found on remote/i,
  /pending migration/i,
  /LOCAL.*REMOTE.*differ/i,
];

// Prøv 'supabase' direkte først, fall tilbake til 'npx supabase'
const probeBin = spawnSync("supabase", ["--version"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
const supabaseBin = probeBin.status === 0 ? "supabase" : "npx";
const supabaseArgs =
  supabaseBin === "npx"
    ? ["supabase", "migration", "list", "--linked"]
    : ["migration", "list", "--linked"];

console.log(
  `[db-status-gate] Running: ${supabaseBin} ${supabaseArgs.join(" ")}\n`,
);

const result = spawnSync(supabaseBin, supabaseArgs, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  timeout: 60_000,
});

const stdout = result.stdout || "";
const stderr = result.stderr || "";
const fullOutput = `${stdout}\n${stderr}`;

// Vis alltid rå output
if (stdout) console.log(stdout);
if (stderr) console.error(stderr);

// Timeout-sjekk
if (result.error?.code === "ETIMEDOUT") {
  console.error("\n\u274C db-status-gate: TIMEOUT etter 60 sek");
  process.exit(1);
}

let allowlistedCount = 0;
let blockingCount = 0;
const blockingLines = [];

// --- Parser 1: Linje-for-linje (tabell-format) ---
const lines = fullOutput.split("\n").filter((line) => line.trim());

for (const line of lines) {
  if (!line.trim() || line.includes("MIGRATION") || line.includes("---")) {
    continue;
  }
  if (line.includes("|") || line.includes("999") || line.match(/\d{14}/)) {
    if (isAllowlisted(line)) {
      allowlistedCount++;
      console.log(`[ALLOWLISTED] ${line.trim()}`);
    } else {
      // Ikke tell som blocking her — sjekk heller fritekst-mønstre nedenfor
      // for å unngå false positives på header-linjer
    }
  }
}

// --- Parser 2: Fritekst-format (robusthet mot CLI-versjonsendringer) ---
const hasMismatch = MISMATCH_PATTERNS.some((p) => p.test(fullOutput));
if (hasMismatch) {
  if (isAllowlisted(fullOutput)) {
    allowlistedCount++;
    console.log("[ALLOWLISTED] Fritekst-mismatch er allowlisted (999-pattern)");
  } else {
    blockingCount++;
    blockingLines.push("Fritekst: " + fullOutput.split("\n").find((l) => MISMATCH_PATTERNS.some((p) => p.test(l))));
  }
}

// Sjekk stderr for hard error (ikke allowlisted)
if (stderr && /\berror\b/i.test(stderr) && !isAllowlisted(stderr)) {
  blockingCount++;
  blockingLines.push("stderr: " + stderr.trim().split("\n")[0]);
}

console.log(
  `\n[db-status-gate] allowlisted=${allowlistedCount} blocking=${blockingCount} strict=${strict}`,
);

// Strict: selv allowlisted items blokkerer
if (strict && allowlistedCount > 0) {
  console.error(
    "\n\u274C db-status-gate: STRICT MODE \u2014 allowlisted items blokkerer:",
  );
  console.error("   Verifiser manuelt at migration-state er korrekt.");
  process.exit(1);
}

if (blockingCount > 0) {
  console.error("\n\u274C db-status-gate: Blocking migration issues funnet:");
  for (const line of blockingLines) {
    console.error(`   - ${line.trim()}`);
  }
  console.error("\n   Kj\u00f8r: npx supabase migration list --linked  (for detaljer)");
  process.exit(1);
}

console.log("\u2705 db-status-gate: pass");
process.exit(0);
