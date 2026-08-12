#!/usr/bin/env node
/**
 * Arch Secret Governance v1 — lekkasje-scan (Master Prompt v4.0 §4)
 *
 * Bruk:
 *   node scripts/arch/secret-audit.mjs [--config]
 *
 * Scanner repoet (ekskl. bygg/deps) og — med --config — ~/.hermes/config.yaml.
 * Skriver ALDRI matchede verdier, kun fil:linje + mønster-type.
 * Exit 1 = funn i versjonskontrollerte filer (lekkasje). Exit 0 = rent.
 * .env.local er gitignoret og lovlig store — telles som info, ikke lekkasje.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");

const PATTERNS = [
  { name: "linear-api-key", re: /lin_api_[A-Za-z0-9]{40,}/ },
  { name: "linear-vision-key", re: /lin_vis_[A-Za-z0-9]+/ },
  { name: "github-token", re: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  { name: "openai-style-key", re: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: "honcho-key", re: /hch-(at|rt)-[A-Za-z0-9]{20,}/ },
  { name: "bearer-token", re: /Bearer\s+[A-Za-z0-9._-]{20,}/ },
  { name: "supabase-pat", re: /sbp_[A-Za-z0-9]{20,}/ },
  { name: "private-key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "aws-key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "slack-token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
];

const SKIP_DIRS = new Set([
  ".git", "node_modules", ".next", "dist", ".open-next", ".chrome-profile",
  "playwright-report", "out", ".turbo", "build",
]);

// Allowlist: .arch/secret-audit.allow — én «fil:mønster» per linje (# = kommentar).
// Brukes KUN for VERIFISERTE test-fixturer/dok-eksempler. Aldri for ekte verdier.
const ALLOWLIST_PATH = join(REPO_ROOT, ".arch", "secret-audit.allow");
function readAllowlist() {
  try {
    const set = new Set();
    for (const line of readFileSync(ALLOWLIST_PATH, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      set.add(t);
    }
    return set;
  } catch {
    return new Set();
  }
}
const allowlist = readAllowlist();

const findings = []; // {file, line, pattern, gitignored}
let scannedFiles = 0;

function isGitignored(relPath) {
  try {
    execFileSync("git", ["check-ignore", "-q", relPath], { cwd: REPO_ROOT, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function scanFile(absPath, relPath) {
  let text;
  try {
    const buf = readFileSync(absPath);
    if (buf.includes(0)) return; // binær
    text = buf.toString("utf8");
  } catch {
    return;
  }
  scannedFiles++;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const p of PATTERNS) {
      if (p.re.test(lines[i])) {
        findings.push({ file: relPath, line: i + 1, pattern: p.name });
      }
    }
  }
}

function walk(dir, rel) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    if (rel === "" && name === ".env.local") continue; // lovlig store — egen info-linje
    const abs = join(dir, name);
    const relPath = rel ? `${rel}/${name}` : name;
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(abs, relPath);
    else if (st.isFile() && st.size < 2_000_000) scanFile(abs, relPath);
  }
}

console.log("Arch Secret Audit v1 — read-only (skriver aldri verdier)");
walk(REPO_ROOT, "");

// ~/.hermes/config.yaml (med --config) — line-basert, aldri verdier
if (process.argv.includes("--config")) {
  const configPath = join(process.env.HOME ?? "", ".hermes", "config.yaml");
  try {
    const lines = readFileSync(configPath, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      for (const p of PATTERNS) {
        if (p.re.test(lines[i])) {
          findings.push({ file: "~/.hermes/config.yaml", line: i + 1, pattern: p.name });
        }
      }
    }
  } catch {
    console.log("  (config.yaml ikke lesbar — hoppet)");
  }
}

const annotated = findings
  .filter((f) => !allowlist.has(`${f.file}:${f.pattern}`))
  .map((f) => {
    const gitignored = f.file.startsWith("~")
      ? false // config.yaml er utenfor repo — regnes som funn (ikke gitignorert)
      : isGitignored(f.file);
    return { ...f, gitignored };
  });

const leaks = annotated.filter((f) => !f.gitignored);
const notes = annotated.filter((f) => f.gitignored);

const args = process.argv.slice(2);
const jsonMode = args.includes("--json") || args.includes("--check");

if (jsonMode) {
  // Metadata-only output (KLA-276 Fase 5) — ALDRI verdier.
  console.log(
    JSON.stringify({
      status: leaks.length ? "leaks_found" : "clean",
      files_scanned: scannedFiles,
      findings: leaks.length,
      gitignored_notes: notes.length,
      details: annotated.slice(0, 50).map((f) => ({
        file: f.file,
        line: f.line,
        pattern: f.pattern,
        severity: f.gitignored ? "note" : "leak",
      })),
    }),
  );
  process.exit(leaks.length ? 1 : 0);
}

console.log(`Scannet ${scannedFiles} filer. Funn: ${annotated.length} (lekkasjer: ${leaks.length}, gitignoret: ${notes.length})`);
for (const f of annotated.slice(0, 100)) {
  console.log(`  [${f.gitignored ? "note " : "LEAK "}] ${f.file}:${f.line} — ${f.pattern}`);
}
if (annotated.length > 100) console.log(`  … (${annotated.length - 100} flere)`);
console.log("Info: .env.local er lovlig store (gitignoret) — ikke scannet.");
process.exit(leaks.length ? 1 : 0);
