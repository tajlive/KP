#!/usr/bin/env node
/**
 * Build-time verification: Ensure no removed page still exists in src/app/
 *
 * Run this script before build to catch accidental re-introduction of
 * deleted pages, or forgotten registry entries.
 *
 * Usage:
 *   node scripts/verify-removed-pages.mjs
 *
 * Exit codes:
 *   0 = all checks pass
 *   1 = a removed page still exists in src/app/ (BLOCK)
 */

import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

/**
 * Parse REMOVED_PAGES from the middleware file without importing it
 * (avoids TypeScript/Next.js dependency issues in CI).
 */
function parseRemovedPages(tsSource) {
  const pages = [];
  const regex = /from:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(tsSource)) !== null) {
    pages.push(match[1]);
  }
  return pages;
}

/**
 * Map a URL path to a potential file path in src/app/[locale]/(...)/
 */
function pathToFileCandidates(urlPath) {
  const clean = urlPath.replace(/^\//, "").replace(/\/$/, "");
  const segments = clean.split("/");

  // Try locale-prefixed paths: src/app/[locale]/(group)/a/b/page.tsx
  // and non-prefixed: src/app/[locale]/(group)/a/b/page.tsx
  const candidates = [];

  // With locale as first segment
  if (segments.length >= 1) {
    const rest = segments.slice(1).join("/");
    candidates.push(
      join(PROJECT_ROOT, "src/app/[locale]", rest, "page.tsx"),
      join(PROJECT_ROOT, "src/app/[locale]", rest, "layout.tsx"),
      join(PROJECT_ROOT, "src/app/[locale]", rest, "route.ts"),
    );
  }

  // Without locale prefix (fallback for root-level paths)
  candidates.push(
    join(PROJECT_ROOT, "src/app/[locale]", clean, "page.tsx"),
    join(PROJECT_ROOT, "src/app/[locale]", clean, "layout.tsx"),
    join(PROJECT_ROOT, "src/app/[locale]", clean, "route.ts"),
  );

  return candidates;
}

async function main() {
  const middlewarePath = join(PROJECT_ROOT, "src/middleware/removed-pages.ts");
  if (!existsSync(middlewarePath)) {
    console.error("❌ removed-pages.ts not found");
    process.exit(1);
  }

  const { readFileSync } = await import("node:fs");
  const source = readFileSync(middlewarePath, "utf-8");
  const removedPaths = parseRemovedPages(source);

  let errors = 0;

  for (const path of removedPaths) {
    const candidates = pathToFileCandidates(path);
    const existing = candidates.filter((c) => existsSync(c));

    if (existing.length > 0) {
      console.error(
        `❌ BLOCK: Removed page "${path}" still exists in source:`,
      );
      for (const file of existing) {
        console.error(`   → ${file.replace(PROJECT_ROOT, "")}`);
      }
      errors++;
    } else {
      console.log(`✅ "${path}" — no stale source files found`);
    }
  }

  if (errors > 0) {
    console.error(
      `\n❌ ${errors} removed page(s) still exist in src/app/. ` +
        `Delete the files or remove the registry entry.`,
    );
    process.exit(1);
  }

  console.log("\n✅ All removed pages verified — no stale files found.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
