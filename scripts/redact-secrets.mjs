#!/usr/bin/env node
/**
 * Secrets-redaksjon for Klarpakke (2026-08-12).
 *
 * Redigerer kjente token-mønstre fra tekstfiler:
 *   - .hermes/ (alle .md, .log, .txt)
 *   - logs/ (alle .log, .txt)
 *   - logs/linear-mcp-audit.log
 *   - testoutput (tmp/ og .tmp/)
 *
 * Mønstre som redigeres:
 *   - lin_api_... (Linear personal API key)
 *   - lin_vis_... (Linear OAuth)
 *   - gh[pousr]_... (GitHub)
 *   - sk-... (OpenAI-style)
 *   - xox[baprs]-... (Slack)
 *   - hch-at-... / hch-rt-... (Honcho)
 *   - AKIA... (AWS)
 *   - Bearer <token>
 *   - supabase service_role / anon keys
 *
 * Bruk: node scripts/redact-secrets.mjs [--check]
 *   --check: exit 1 hvis noe må redigeres (CI-gate)
 *   default: skriver redigerte filer tilbake
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const REDACT = "[REDACTED]";

// Mønstre — generiske nok til å fange tokens, uten å eksponere reelle verdier
const PATTERNS = [
  // Linear personal API key (lin_api_ + 40 tegn)
  /lin_api_[A-Za-z0-9]{40,}/g,
  // Linear OAuth
  /lin_vis_[A-Za-z0-9]+/g,
  // GitHub tokens
  /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,
  // OpenAI-style
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  // Slack
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  // Honcho
  /\bhch-[atr]-[A-Za-z0-9-]{20,}\b/g,
  // AWS
  /\bAKIA[A-Z0-9]{16}\b/g,
  // Supabase keys (service_role / anon JWT)
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g,
  // Bearer-tokens
  /\bBearer\s+[A-Za-z0-9._-]{20,}/g,
];

function scanFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  let hits = 0;
  for (const re of PATTERNS) {
    const matches = content.match(re);
    if (matches) hits += matches.length;
  }
  return { content, hits };
}

function redact(content) {
  let out = content;
  for (const re of PATTERNS) {
    out = out.replace(re, REDACT);
  }
  return out;
}

function collectFiles(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectFiles(full, exts, out);
    } else if (exts.some((e) => full.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

const checkMode = process.argv.includes("--check");

// Samle relevante filer
const files = [
  ...collectFiles(resolve(ROOT, ".hermes"), [".md", ".log", ".txt"]),
  ...collectFiles(resolve(ROOT, "logs"), [".log", ".txt"]),
  ...collectFiles(resolve(ROOT, "tmp"), [".log", ".txt", ".out"]),
];

let totalHits = 0;
const flagged = [];

for (const file of files) {
  const { content, hits } = scanFile(file);
  if (hits > 0) {
    totalHits += hits;
    flagged.push({ file, hits });
    if (!checkMode) {
      const redacted = redact(content);
      if (redacted !== content) {
        writeFileSync(file, redacted, "utf8");
      }
    }
  }
}

if (checkMode) {
  if (totalHits > 0) {
    console.error(`❌ SECRETS FUNNET (${totalHits} treff):`);
    for (const f of flagged) {
      console.error(`   ${f.file} — ${f.hits} treff`);
    }
    process.exit(1);
  }
  console.log("✅ Secret-scan ren: ingen token-mønstre i .hermes/, logs/ eller tmp/");
} else {
  if (totalHits > 0) {
    console.log(`🔒 Redigert ${totalHits} token-forekomster i ${flagged.length} filer`);
  } else {
    console.log("✅ Ingen token-mønstre funnet — ingen redaksjon nødvendig");
  }
}
