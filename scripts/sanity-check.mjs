#!/usr/bin/env node
/**
 * Sanity Guard — Automatic Sanity CMS Configuration Checker
 *
 * Usage:
 *   node scripts/sanity-check.mjs           # Check only
 *   node scripts/sanity-check.mjs --fix     # Auto-fix code issues
 *   node scripts/sanity-check.mjs --json    # CI-friendly output
 */

import * as fs from "fs";
import * as path from "path";

// ─── Config ───────────────────────────────────────────────────────────────
const SRC_DIR = path.resolve(process.cwd(), "src");
const ROOT_DIR = process.cwd();
const ENV_FILES = [".env.local", ".env.production", ".env"];
const EXPECTED_API_VERSION = "2024-04-07";
const EXPECTED_PROJECT_ID = "63qn23si";
const EXPECTED_DATASET = "production";

// ─── Types ────────────────────────────────────────────────────────────────
const C = {
  rst: "\x1b[0m",
  red: "\x1b[31m",
  grn: "\x1b[32m",
  ylw: "\x1b[33m",
  blu: "\x1b[34m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

const args = process.argv.slice(2);
const shouldFix = args.includes("--fix");
const jsonMode = args.includes("--json");

const issues = [];
const fixesApplied = [];

function log(msg) {
  if (!jsonMode) console.log(msg);
}

function addIssue(file, line, severity, message, fix) {
  issues.push({ file, line, severity, message, fix });
}

// ─── Env Checks ───────────────────────────────────────────────────────────
function checkEnvFiles() {
  const hasLocalEnv = fs.existsSync(path.resolve(ROOT_DIR, ".env.local"));

  for (const envFile of ENV_FILES) {
    const envPath = path.resolve(ROOT_DIR, envFile);
    if (!fs.existsSync(envPath)) continue;

    const content = fs.readFileSync(envPath, "utf8");

    // Skip base .env if .env.local exists (it usually only has generic stuff)
    if (envFile === ".env" && hasLocalEnv) {
      continue;
    }

    // Check required vars
    const requiredVars = [
      "NEXT_PUBLIC_SANITY_PROJECT_ID",
      "NEXT_PUBLIC_SANITY_DATASET",
      "NEXT_PUBLIC_SANITY_API_VERSION",
    ];

    for (const v of requiredVars) {
      if (!content.includes(v)) {
        addIssue(envFile, 0, "error", `Missing ${v} in ${envFile}`);
      }
    }

    // Check optional but recommended vars
    if (!content.includes("SANITY_API_READ_TOKEN")) {
      addIssue(envFile, 0, "warning", `Missing SANITY_API_READ_TOKEN in ${envFile} (needed for preview mode)`);
    }
    if (!content.includes("SANITY_WEBHOOK_SECRET")) {
      addIssue(envFile, 0, "warning", `Missing SANITY_WEBHOOK_SECRET in ${envFile} (needed for cache revalidation)`);
    }

    // Check API version consistency
    const versionMatch = content.match(/NEXT_PUBLIC_SANITY_API_VERSION\s*=\s*["']?([^\n"']+)["']?/);
    if (versionMatch && versionMatch[1] !== EXPECTED_API_VERSION) {
      addIssue(envFile, 0, "warning", `API version mismatch: ${versionMatch[1]} (expected ${EXPECTED_API_VERSION})`);
    }

    // Check project ID consistency
    const projectMatch = content.match(/NEXT_PUBLIC_SANITY_PROJECT_ID\s*=\s*["']?([^\n"']+)["']?/);
    if (projectMatch) {
      const actualProjectId = projectMatch[1].replace(/\\n$/, ""); // fix escaped newlines
      if (actualProjectId !== EXPECTED_PROJECT_ID) {
        addIssue(envFile, 0, "error", `Project ID mismatch: ${actualProjectId} (expected ${EXPECTED_PROJECT_ID})`);
      }
    }
  }
}

// ─── Source Code Checks ───────────────────────────────────────────────────
function* walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      yield* walkDir(full);
    } else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) {
      yield full;
    }
  }
}

function checkSourceCode() {
  const allowedHardcodeFiles = [
    "sanity.cli.ts",
    "env.ts",
    "run-sanity-mcp.mjs",
    "sanity-check.mjs",
    "migrate-to-sanity.ts",
  ];

  for (const file of walkDir(SRC_DIR)) {
    const rel = path.relative(ROOT_DIR, file);
    const basename = path.basename(file);
    if (allowedHardcodeFiles.some((f) => basename === f)) continue;

    const lines = fs.readFileSync(file, "utf8").split("\n");

    lines.forEach((line, idx) => {
      // Check for hardcoded projectId (but allow imports from env)
      if (/projectId\s*[:=]\s*['"]\w{8}['"]/.test(line) && !line.includes("import") && !line.includes("from")) {
        addIssue(rel, idx + 1, "error", `Hardcoded Sanity projectId found`, {
          old: line,
          new: line.replace(/['"]\w{8}['"]/, "process.env.NEXT_PUBLIC_SANITY_PROJECT_ID"),
        });
      }

      // Check for hardcoded dataset
      if (/dataset\s*[:=]\s*['"](production|staging)['"]/.test(line) && !line.includes("import") && !line.includes("from")) {
        addIssue(rel, idx + 1, "warning", `Hardcoded Sanity dataset found`, {
          old: line,
          new: line.replace(/['"](production|staging)['"]/, "process.env.NEXT_PUBLIC_SANITY_DATASET"),
        });
      }

      // Check for old API versions
      if (/202[456]-04-(11|15)|2026-04-15/.test(line)) {
        addIssue(rel, idx + 1, "warning", `Old/inconsistent Sanity API version found`, {
          old: line,
          new: line.replace(/202[456]-04-(11|15)|2026-04-15/g, EXPECTED_API_VERSION),
        });
      }
    });
  }
}

// ─── Specific File Checks ─────────────────────────────────────────────────
function checkCriticalFiles() {
  const clientPath = path.join(SRC_DIR, "lib", "sanity", "client.ts");
  if (fs.existsSync(clientPath)) {
    const content = fs.readFileSync(clientPath, "utf8");
    if (!content.includes("safeFetch")) {
      addIssue("src/lib/sanity/client.ts", 0, "error", `safeFetch helper is missing`);
    }
  } else {
    addIssue("src/lib/sanity/client.ts", 0, "error", `client.ts is missing`);
  }

  const tokensPath = path.join(SRC_DIR, "lib", "sanity", "tokens.ts");
  if (fs.existsSync(tokensPath)) {
    const content = fs.readFileSync(tokensPath, "utf8");
    if (!content.includes("DEFAULT_TOKENS_CSS")) {
      addIssue("src/lib/sanity/tokens.ts", 0, "warning", `DEFAULT_TOKENS_CSS fallback is missing`);
    }
  }

  const webhookPath = path.join(SRC_DIR, "app", "api", "webhooks", "sanity", "route.ts");
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, "utf8");
    if (!content.includes("isValidSignature")) {
      addIssue("src/app/api/webhooks/sanity/route.ts", 0, "error", `Webhook signature validation is missing`);
    }
    if (!content.includes("SANITY_WEBHOOK_SECRET")) {
      addIssue("src/app/api/webhooks/sanity/route.ts", 0, "error", `SANITY_WEBHOOK_SECRET is not referenced`);
    }
  } else {
    addIssue("src/app/api/webhooks/sanity/route.ts", 0, "warning", `Webhook route is missing`);
  }
}

// ─── Auto-fix ─────────────────────────────────────────────────────────────
function applyFixes() {
  if (!shouldFix) return;

  for (const issue of issues) {
    if (issue.fix && issue.severity !== "info") {
      const filePath = path.resolve(ROOT_DIR, issue.file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf8");
        if (content.includes(issue.fix.old)) {
          fs.writeFileSync(filePath, content.replace(issue.fix.old, issue.fix.new));
          fixesApplied.push(`${issue.file}:${issue.line}`);
        }
      }
    }
  }
}

// ─── Report ───────────────────────────────────────────────────────────────
function printReport() {
  if (jsonMode) {
    console.log(JSON.stringify({ ok: issues.filter((i) => i.severity === "error").length === 0, issues, fixesApplied }, null, 2));
    return;
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");

  log(`\n${C.bold}🎨 Sanity Guard Report${C.rst}\n`);

  if (errors.length === 0 && warnings.length === 0) {
    log(`${C.grn}✅ All Sanity checks passed!${C.rst}`);
  } else {
    for (const i of errors) {
      log(`${C.red}✖ ${i.file}:${i.line}${C.rst} ${i.message}`);
    }
    for (const i of warnings) {
      log(`${C.ylw}⚠ ${i.file}:${i.line}${C.rst} ${i.message}`);
    }
  }

  if (fixesApplied.length > 0) {
    log(`\n${C.grn}🔧 Auto-fixes applied:${C.rst}`);
    fixesApplied.forEach((f) => log(`   ${f}`));
  }

  log(`\n${C.dim}Errors: ${errors.length} | Warnings: ${warnings.length} | Info: ${infos.length}${C.rst}`);

  // Copy-paste config
  log(`\n${C.blu}📋 Copy-Paste Config (always up-to-date):${C.rst}`);
  log(`   Sanity Manage: https://www.sanity.io/manage/project/${EXPECTED_PROJECT_ID}`);
  log(`   CORS Origins:  http://localhost:3000, https://www.klarpakke.no, https://klarpakke.no`);
  log(`   Webhook URL:   https://www.klarpakke.no/api/webhooks/sanity`);
  log(`   Studio URL:    https://www.klarpakke.no/studio (embedded)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────
function main() {
  checkEnvFiles();
  checkSourceCode();
  checkCriticalFiles();
  applyFixes();
  printReport();

  const hasErrors = issues.some((i) => i.severity === "error");
  process.exit(hasErrors ? 1 : 0);
}

main();
