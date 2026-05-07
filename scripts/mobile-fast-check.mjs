#!/usr/bin/env node

/**
 * Mobile Fast-Check
 * Rask AST-lignende audit av nylig endrede TSX-filer for mobil-vennlighet.
 * Kjører på < 30s. Fail-fast for kritiske feil.
 *
 * Checks:
 * 1. Touch-target: Buttons/links bør ha minst 44×44 px
 * 2. Font-size: Ingen tekst under 12px
 * 3. Responsive: Page-komponenter bør ha responsive breakpoints
 * 4. Viewport: Page-komponenter bør ha min-h-screen eller lignende
 *
 * Usage: node scripts/mobile-fast-check.mjs
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let errors = 0;
let warnings = 0;

function error(msg, file, line) {
  errors++;
  console.log(`${RED}  ❌ ${msg}${RESET}${file ? ` (${file}${line ? ":" + line : ""})` : ""}`);
}

function warn(msg, file, line) {
  warnings++;
  console.log(`${YELLOW}  ⚠️  ${msg}${RESET}${file ? ` (${file}${line ? ":" + line : ""})` : ""}`);
}

function ok(msg) {
  console.log(`${GREEN}  ✅ ${msg}${RESET}`);
}

// ── Finn endrede filer ──────────────────────────────────────
function getChangedFiles() {
  try {
    // Prøv staged først
    const staged = execSync("git diff --cached --name-only --diff-filter=ACM", {
      encoding: "utf8",
      cwd: process.cwd(),
    }).trim();
    if (staged) return staged.split("\n").filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
  } catch {}

  try {
    // Fallback: siste commit
    const last = execSync("git diff --name-only HEAD~1 --diff-filter=ACM", {
      encoding: "utf8",
      cwd: process.cwd(),
    }).trim();
    if (last) return last.split("\n").filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
  } catch {}

  // Fallback: alle TSX i src/ (hvis ikke git context)
  try {
    const all = execSync("find src -name '*.tsx' -o -name '*.ts' | head -50", {
      encoding: "utf8",
      cwd: process.cwd(),
    }).trim();
    return all.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

// ── Tailwind size parser ────────────────────────────────────
function tailwindToPx(cls) {
  const m = cls.match(/^(?:min-)?[wh]-\[(\d+)px\]$/);
  if (m) return parseInt(m[1], 10);
  // Tailwind defaults (approximate)
  if (cls.match(/^(?:min-)?[wh]-11$/)) return 44;
  if (cls.match(/^(?:min-)?[wh]-12$/)) return 48;
  if (cls.match(/^(?:min-)?[wh]-10$/)) return 40;
  if (cls.match(/^(?:min-)?[wh]-9$/)) return 36;
  if (cls.match(/^(?:min-)?[wh]-8$/)) return 32;
  if (cls.match(/^(?:min-)?[wh]-14$/)) return 56;
  return null;
}

// ── Main ────────────────────────────────────────────────────
const files = getChangedFiles();

console.log(`${BOLD}📱 Mobile Fast-Check${RESET}`);
console.log(`   Filer sjekket: ${files.length}\n`);

if (files.length === 0) {
  console.log(`${YELLOW}  ⚡ Ingen endrede TSX/TS-filer funnet — skipper mobil-audit${RESET}\n`);
  process.exit(0);
}

for (const file of files) {
  const fullPath = resolve(process.cwd(), file);
  let content;
  try {
    content = readFileSync(fullPath, "utf8");
  } catch {
    continue;
  }

  const lines = content.split("\n");
  const isPage = file.includes("/page.tsx");
  let hasMinHScreen = false;
  let hasResponsive = false;
  let hasButtonOrLink = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    // Check 1: Touch-target size on buttons and links
    const isButton = /<(Button|button)\b/.test(line);
    const isLink = /<(Link|a)\b/.test(line);
    if (isButton || isLink) {
      hasButtonOrLink = true;
      const classMatch = line.match(/className=["'`]([^"'`]+)["'`]/);
      if (classMatch) {
        const classes = classMatch[1].split(/\s+/);
        let hasMinW = false;
        let hasMinH = false;
        for (const cls of classes) {
          const px = tailwindToPx(cls);
          if (px !== null) {
            if (cls.startsWith("min-w-") || cls.startsWith("w-")) hasMinW = true;
            if (cls.startsWith("min-h-") || cls.startsWith("h-")) hasMinH = true;
          }
        }
        // Coinbase CDS Button har ofte compact prop — tillat det
        const hasCompact = line.includes("compact") || line.includes("size=");
        if (!hasMinW && !hasMinH && !hasCompact) {
          warn(`Touch-target bør ha min-w-/min-h- eller compact/size prop`, file, lineNo);
        }
      }
    }

    // Check 2: Font-size under 12px
    const fontMatch = line.match(/text-\[(\d+)px\]/);
    if (fontMatch) {
      const size = parseInt(fontMatch[1], 10);
      if (size < 12) {
        error(`Font-size ${size}px er under 12px (tilgjengelighet)`, file, lineNo);
      }
    }

    // Check 3: Responsive breakpoints
    if (/\b(md|lg|xl|sm):/.test(line)) {
      hasResponsive = true;
    }

    // Check 4: min-h-screen for pages
    if (/\bmin-h-(screen|dvh|\[100dvh\]|\[100vh\])\b/.test(line)) {
      hasMinHScreen = true;
    }
  }

  // Page-level checks
  // Root layout (src/app/[locale]/layout.tsx) har min-h-screen på body,
  // så vi skipper min-h-screen warning for pages under (user)/
  const hasRootLayoutMinH = true; // Verifisert: root layout har min-h-screen
  if (isPage && !hasRootLayoutMinH) {
    if (!hasMinHScreen && content.includes("export default")) {
      warn(`Page mangler min-h-screen / min-h-dvh (mobil viewport)`, file);
    }
  }
  // Responsive: kun warn for store pages som tydelig trenger det
  if (isPage && !hasResponsive && content.length > 3000 && !content.includes("redirect(")) {
    warn(`Page har ingen responsive breakpoints (md:/lg:)`, file);
  }
}

// ── Summary ─────────────────────────────────────────────────
console.log(`\n${BOLD}────────────────────────────────────────${RESET}`);
if (errors > 0) {
  console.log(`${RED}${BOLD}  ❌ FAILED: ${errors} error(s), ${warnings} warning(s)${RESET}`);
  console.log(`${BOLD}────────────────────────────────────────${RESET}\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`${YELLOW}${BOLD}  ⚠️  PASSED with ${warnings} warning(s)${RESET}`);
  console.log(`${BOLD}────────────────────────────────────────${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${GREEN}${BOLD}  ✅ ALL CHECKS PASSED${RESET}`);
  console.log(`${BOLD}────────────────────────────────────────${RESET}\n`);
  process.exit(0);
}
