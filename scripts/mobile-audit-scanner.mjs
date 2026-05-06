#!/usr/bin/env node
/**
 * Mobile Audit Scanner
 *
 * Skanner kodebasen for mønstre som ofte fører til
 * "bare hardkodet tekst på mobil"-problemer:
 *
 * 1. Conditional rendering (data ? X : null) UTEN loading eller empty state
 * 2. useEffect som fetcher data men ikke håndterer error
 * 3. Charts med fixed height som kan overflow på mobil
 * 4. Manglende pb- (padding-bottom) for fixed bottom-nav
 * 5. Grid-kolonner uten mobil-breakpoint
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const SRC_DIR = "src";
const FINDINGS = [];

function walk(dir, cb) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const st = statSync(path);
    if (st.isDirectory()) {
      walk(path, cb);
    } else if (st.isFile()) {
      cb(path);
    }
  }
}

function addFinding(file, line, type, message, severity = "warning") {
  FINDINGS.push({ file, line, type, message, severity });
}

function scanFile(path) {
  const ext = extname(path);
  if (![".tsx", ".ts", ".jsx", ".js"].includes(ext)) return;
  if (path.includes("__tests__") || path.includes(".test.")) return;

  const content = readFileSync(path, "utf-8");
  const lines = content.split("\n");

  // Pattern 1: data ? <Component /> : null  (uten loading/else)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\bdata\s*\?\s*[<(]/.test(line) && /:\s*null\s*[,;)]?\s*$/.test(line)) {
      addFinding(path, i + 1, "CONDITIONAL_RENDER", "data ? X : null — ingen loading eller empty state fallback", "error");
    }
  }

  // Pattern 2: useEffect med fetch men uten error-håndtering (filtrer bort try/catch med console.error eller setError)
  if (content.includes("useEffect") && content.includes("fetch(")) {
    const hasTryCatch = content.includes("try{" ) || content.includes("try {");
    const hasCatchWithHandler = /catch\s*\([^)]*\)\s*\{[\s\S]{0,200}?(setError|console\.error|toast|alert)/.test(content);
    const hasCatchAll = /catch\s*\([^)]*\)/.test(content);
    if (!hasTryCatch && !hasCatchAll) {
      addFinding(path, 0, "UNHANDLED_FETCH", "fetch() uten try/catch — ukjente feil vil krasje komponenten", "error");
    } else if (hasTryCatch && !hasCatchWithHandler) {
      addFinding(path, 0, "SILENT_ERROR", "try/catch med fetch men uten error-rapportering (bruker ser ingenting ved feil)", "warning");
    }
  }

  // Pattern 3: Fixed height charts uten sm: responsive
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/h-\[\d+px\]/.test(line) && !/sm:h-|md:h-|lg:h-|xl:h-/.test(line)) {
      // Kun hvis det er innenfor en chart-komponent
      if (content.includes("Chart") || content.includes("chart") || content.includes("recharts")) {
        addFinding(path, i + 1, "FIXED_CHART_HEIGHT", "Fixed chart height uten mobil-breakpoint", "warning");
      }
    }
  }

  // Pattern 4: Manglende pb- for bottom-nav i main/shell-komponenter
  if (path.includes("layout") || path.includes("Shell") || path.includes("Dashboard")) {
    if (content.includes("bottom") && content.includes("fixed")) {
      if (!content.includes("pb-") && !content.includes("padding-bottom")) {
        addFinding(path, 0, "MISSING_BOTTOM_PADDING", "Fixed bottom element uten padding-bottom på container", "warning");
      }
    }
  }

  // Pattern 5: Grid med mange kolonner uten mobil-breakpoint
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/grid-cols-\d/.test(line) && !/grid-cols-1/.test(line)) {
      if (!/sm:grid|md:grid|lg:grid/.test(line)) {
        addFinding(path, i + 1, "GRID_NO_MOBILE", "Grid med kolonner uten mobil-breakpoint", "warning");
      }
    }
  }

  // Pattern 6: overflow-x-auto på tabeller (mobil scroll)
  if (content.includes("overflow-x-auto") && !content.includes("overflow-x-auto" + "max-w")) {
    addFinding(path, 0, "HORIZONTAL_SCROLL", "overflow-x-auto kan gi dårlig mobil-UX", "info");
  }

  // Pattern 7: touch targets < 44px
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/px-1|px-1\.5|py-0\.5|text-xs/.test(line) && /button|onClick|href/.test(line)) {
      addFinding(path, i + 1, "SMALL_TOUCH_TARGET", "Potensielt for lite touch target på mobil", "info");
    }
  }
}

// Kjør scan
walk(SRC_DIR, scanFile);

// Group by severity
const errors = FINDINGS.filter((f) => f.severity === "error");
const warnings = FINDINGS.filter((f) => f.severity === "warning");
const infos = FINDINGS.filter((f) => f.severity === "info");

console.log("\n" + "=".repeat(70));
console.log("  MOBILE AUDIT SCANNER — Resultater");
console.log("=".repeat(70));
console.log(`\n  🔴 Errors:     ${errors.length}`);
console.log(`  🟡 Warnings:   ${warnings.length}`);
console.log(`  🔵 Info:       ${infos.length}\n`);

if (errors.length > 0) {
  console.log("--- ERRORS (bør fikses) ---");
  for (const f of errors.slice(0, 20)) {
    console.log(`  ${f.file}:${f.line} [${f.type}] ${f.message}`);
  }
  if (errors.length > 20) console.log(`  ... og ${errors.length - 20} til`);
}

if (warnings.length > 0) {
  console.log("\n--- WARNINGS (vurderes) ---");
  for (const f of warnings.slice(0, 15)) {
    console.log(`  ${f.file}:${f.line} [${f.type}] ${f.message}`);
  }
  if (warnings.length > 15) console.log(`  ... og ${warnings.length - 15} til`);
}

console.log("\n" + "=".repeat(70));

// Exit code = antall errors
process.exit(errors.length > 0 ? 1 : 0);
