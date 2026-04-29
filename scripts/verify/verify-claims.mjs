#!/usr/bin/env node
/**
 * Verify Claims — Post-change verification script
 *
 * Usage:
 *   node scripts/verify/verify-claims.mjs [claim-file.json]
 *
 * Run it AFTER making changes, before committing.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { globSync } from "glob";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

let exitCode = 0;

function fail(msg) {
  console.error(`${RED}✗${RESET} ${msg}`);
  exitCode = 1;
}

function pass(msg) {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}

function warn(msg) {
  console.log(`${YELLOW}⚠${RESET} ${msg}`);
}

function info(msg) {
  console.log(`${DIM}  ${msg}${RESET}`);
}

function listFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = `${dir}/${entry}`;
    const st = statSync(full);
    if (st.isDirectory()) {
      listFiles(full, files);
    } else if (/\.(tsx|ts|jsx|js|css)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function verifyInFile({ file, pattern, expected, notExpected, description }) {
  const desc = description || `${file}: "${pattern}"`;
  if (!existsSync(file)) {
    fail(`${desc} — file does not exist`);
    return;
  }
  const content = readFileSync(file, "utf-8");
  const found = content.includes(pattern);

  if (!found) {
    fail(`${desc} — pattern "${pattern}" NOT found`);
    return;
  }

  if (expected && !content.includes(expected)) {
    fail(`${desc} — pattern found but expected "${expected}" NOT found nearby`);
    return;
  }

  if (notExpected && content.includes(notExpected)) {
    fail(`${desc} — pattern found but FORBIDDEN "${notExpected}" was found`);
    return;
  }

  pass(desc);
}

function checkOrphans(deletedPages) {
  console.log(`\n${BOLD}Orphaned file check${RESET}`);
  let foundOrphans = false;

  for (const pagePath of deletedPages) {
    const dir = pagePath.replace(/\/page\.(tsx|jsx|js)$/, "");
    if (!existsSync(dir)) continue;

    const remaining = listFiles(dir).filter(
      (f) => !f.endsWith("/page.tsx") && !f.endsWith("/page.jsx") && !f.endsWith("/page.js")
    );

    for (const file of remaining) {
      const basename = file.split("/").pop().replace(/\.(tsx|jsx|ts|js|css)$/, "");
      const importPattern = new RegExp(
        `import\\s+.*\\b${basename}\\b|from\\s+['"].*${basename}['"]|require\\(['"].*${basename}['"]\\)`,
        "i"
      );

      const allFiles = globSync("src/**/*.{tsx,jsx,ts,js}");
      let imported = false;
      for (const srcFile of allFiles) {
        if (srcFile === file) continue;
        try {
          const content = readFileSync(srcFile, "utf-8");
          if (importPattern.test(content)) {
            imported = true;
            break;
          }
        } catch {}
      }

      if (!imported) {
        warn(`Possible orphan: ${file} (not imported anywhere)`);
        foundOrphans = true;
      }
    }
  }

  if (!foundOrphans) {
    pass("No orphaned files detected");
  }
}

const ROUTE_GROUPS = [
  "(academy)", "(admin)", "(auth)", "(beta)", "(commerce)",
  "(legal)", "(marketing)", "(onboarding)", "(social)", "(user)"
];

function findPageForRoute(routeSegment) {
  if (!routeSegment) return null;
  const cleanSeg = routeSegment.replace(/^:locale\//, "").replace(/^\//, "").replace(/\/$/, "");
  if (!cleanSeg || cleanSeg.includes(":")) return null;

  // Direct match in any route group
  for (const g of ROUTE_GROUPS) {
    const p = `src/app/[locale]/${g}/${cleanSeg}/page.tsx`;
    if (existsSync(p)) return p;
    const pts = `src/app/[locale]/${g}/${cleanSeg}/page.ts`;
    if (existsSync(pts)) return pts;
  }

  // Direct match without route group
  const direct = `src/app/[locale]/${cleanSeg}/page.tsx`;
  if (existsSync(direct)) return direct;

  // Try glob for catch-all or dynamic segments
  const globs = globSync(`src/app/[locale]/*/${cleanSeg}/page.tsx`);
  if (globs.length > 0) return globs[0];

  // Check for [...slug] catch-all
  const catchAll = `src/app/[locale]/[...${cleanSeg}]/page.tsx`;
  if (existsSync(catchAll)) return catchAll;

  return null;
}

function checkRouteConsistency() {
  console.log(`\n${BOLD}Route consistency check${RESET}`);

  const nextConfigRaw = readFileSync("next.config.mjs", "utf-8");
  // Strip comments to avoid matching commented-out redirects
  const nextConfig = nextConfigRaw.replace(/\/\/.*$/gm, "");
  const redirectRegex = /\{ source:\s*['"]([^'"]+)['"],\s*destination:\s*['"]([^'"]+)['"]/g;
  const redirects = [];
  let match;
  while ((match = redirectRegex.exec(nextConfig)) !== null) {
    redirects.push({ source: match[1], destination: match[2] });
  }

  let issues = 0;
  let passed = 0;

  for (const { source, destination } of redirects) {
    if (destination.startsWith("http")) continue;
    if (source.includes(":path*")) continue; // dynamic catch-all, skip

    let destPath = destination
      .replace(/^\/no\//, "")
      .replace(/^\/en\//, "");

    if (destPath.includes("?")) {
      destPath = destPath.split("?")[0];
    }

    destPath = destPath.replace(/^\//, "");
    if (!destPath) {
      // Root redirect — always valid
      passed++;
      continue;
    }

    // Special case: /no and /en are locale roots -> [locale]/page.tsx
    const isLocaleRoot = /^no$|^en$/.test(destPath);
    const pageFile = isLocaleRoot ? "src/app/[locale]/page.tsx" : findPageForRoute(destPath);
    if (!pageFile || !existsSync(pageFile)) {
      warn(`${source} → ${destination} — no page found`);
      issues++;
    } else {
      passed++;
    }
  }

  if (issues === 0) {
    pass(`All ${passed} redirect destinations have corresponding pages`);
  } else {
    info(`${passed} OK, ${issues} missing destination pages`);
  }
}

function checkDeletedFiles(deletedPages) {
  console.log(`\n${BOLD}Deleted file check${RESET}`);
  for (const file of deletedPages) {
    if (existsSync(file)) {
      fail(`Expected deleted: ${file} — STILL EXISTS`);
    } else {
      pass(`Deleted: ${file}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  let claims = [];
  let deletedPages = [];

  if (args[0] && existsSync(args[0])) {
    try {
      const input = readFileSync(args[0], "utf-8");
      const parsed = JSON.parse(input);
      claims = parsed.claims || [];
      deletedPages = parsed.deletedPages || [];
    } catch (e) {
      console.error("Failed to parse claims file:", e.message);
      process.exit(1);
    }
  } else {
    claims = [
      {
        file: "src/middleware/i18n.ts",
        pattern: '/innstillinger"',
        expected: '/profile?tab=settings',
        description: "/innstillinger redirects to /profile?tab=settings",
      },
      {
        file: "src/middleware/i18n.ts",
        pattern: '/settings"',
        expected: '/profile?tab=settings',
        description: "/settings redirects to /profile?tab=settings",
      },
      {
        file: "next.config.mjs",
        pattern: '"/om"',
        expected: '"/no/om-oss"',
        description: "/om redirects to /no/om-oss in next.config",
      },
      {
        file: "next.config.mjs",
        pattern: '"/settings"',
        expected: '"/no/profile?tab=settings"',
        description: "/settings redirects to /no/profile?tab=settings in next.config (synced with middleware)",
      },
      {
        file: "src/app/api/stripe/customer-portal/route.ts",
        pattern: "/dashboard/settings",
        description: "Stripe customer portal return URL uses /dashboard/settings",
      },
    ];
    deletedPages = [
      "src/app/[locale]/(marketing)/om/page.tsx",
      "src/app/[locale]/(user)/innstillinger/page.tsx",
    ];
  }

  console.log(`${BOLD}Verify Claims${RESET} — Post-change verification\n`);

  for (const claim of claims) {
    verifyInFile(claim);
  }

  checkDeletedFiles(deletedPages);
  checkOrphans(deletedPages);
  checkRouteConsistency();

  console.log("");
  if (exitCode === 0) {
    console.log(`${GREEN}${BOLD}All checks passed ✓${RESET}`);
  } else {
    console.log(`${RED}${BOLD}Some checks failed — review above ✗${RESET}`);
  }
  process.exit(exitCode);
}

main();
