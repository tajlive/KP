#!/usr/bin/env node
/**
 * Check Stale Types — Verify .next/types doesn't reference deleted files.
 *
 * Run after file deletions before `tsc --noEmit`.
 * Clears cache automatically if stale references found.
 */

import { globSync } from "glob";
import { readFileSync, existsSync, rmSync } from "fs";
import { execSync } from "child_process";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function findStaleReferences() {
  const stale = [];
  const typeFiles = globSync(".next/types/**/*.ts");
  const generatedFiles = globSync(".next/**/*.d.ts");

  for (const tf of [...typeFiles, ...generatedFiles]) {
    try {
      const content = readFileSync(tf, "utf-8");
      const importMatches = content.match(/from\s+['"]([^'"]+)['"]/g) || [];

      for (const imp of importMatches) {
        const pathMatch = imp.match(/from\s+['"]([^'"]+)['"]/);
        if (!pathMatch) continue;
        const path = pathMatch[1];

        // Check if path references a deleted .tsx file
        if (
          path.includes("/page") ||
          path.includes("/layout") ||
          path.includes("/loading") ||
          path.includes("/error") ||
          path.includes("/not-found")
        ) {
          const sourcePath = path.replace("../../", "src/").replace("../", "src/");
          if (sourcePath.startsWith("src/") && !existsSync(sourcePath)) {
            stale.push({ typeFile: tf, missingSource: sourcePath });
          }
        }
      }
    } catch {}
  }

  return stale;
}

function main() {
  console.log(`${BOLD}Stale Type Cache Check${RESET}\n`);

  const stale = findStaleReferences();

  if (stale.length === 0) {
    console.log(`${GREEN}✓${RESET} No stale type references found`);
    process.exit(0);
  }

  console.log(`${YELLOW}⚠${RESET} Found ${stale.length} stale reference(s):`);
  for (const { typeFile, missingSource } of stale) {
    console.log(`  ${RED}✗${RESET} ${typeFile} → ${missingSource}`);
  }

  console.log(`\n${YELLOW}Clearing .next cache...${RESET}`);
  rmSync(".next", { recursive: true, force: true });
  console.log(`${GREEN}✓${RESET} Cache cleared. Re-run build/typecheck.`);
  process.exit(1);
}

main();
