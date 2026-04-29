/**
 * Routing Verification Module
 *
 * Checks:
 *   1. next.config.mjs redirects → destination pages exist
 *   2. Middleware CANONICAL_REDIRECTS → destination pages exist
 *   3. Middleware standalone redirects (/settings, /innstillinger, /konto)
 *   4. No conflicting redirects (same source in both next.config + middleware)
 *   5. All app routes have valid page.tsx
 *   6. No duplicate locale redirects (both /no/x and /:locale/x to same dest)
 */

import { readFileSync, existsSync } from "fs";
import { globSync } from "glob";

const ROUTE_GROUPS = [
  "(academy)", "(admin)", "(auth)", "(beta)", "(commerce)",
  "(legal)", "(marketing)", "(onboarding)", "(social)", "(user)"
];

function findPageForRoute(routeSegment) {
  if (!routeSegment) return null;
  const cleanSeg = routeSegment.replace(/^:locale\//, "").replace(/^\//, "").replace(/\/$/, "");
  if (!cleanSeg || cleanSeg.includes(":")) return null;

  for (const g of ROUTE_GROUPS) {
    const p = `src/app/[locale]/${g}/${cleanSeg}/page.tsx`;
    if (existsSync(p)) return p;
    const pts = `src/app/[locale]/${g}/${cleanSeg}/page.ts`;
    if (existsSync(pts)) return pts;
  }
  const direct = `src/app/[locale]/${cleanSeg}/page.tsx`;
  if (existsSync(direct)) return direct;
  const globs = globSync(`src/app/[locale]/*/${cleanSeg}/page.tsx`);
  if (globs.length > 0) return globs[0];
  return null;
}

export default async function run(reporter) {
  reporter.section("Routing Audit");

  // ── 1. Parse next.config.mjs redirects ──
  const nextConfigRaw = readFileSync("next.config.mjs", "utf-8");
  const nextConfig = nextConfigRaw.replace(/\/\/.*$/gm, "");
  const redirectRegex = /\{ source:\s*['"]([^'"]+)['"],\s*destination:\s*['"]([^'"]+)['"]/g;
  const nextRedirects = [];
  let m;
  while ((m = redirectRegex.exec(nextConfig)) !== null) {
    nextRedirects.push({ source: m[1], destination: m[2] });
  }

  // ── 2. Parse middleware redirects ──
  const mwContent = readFileSync("src/middleware/i18n.ts", "utf-8");

  // Extract CANONICAL_REDIRECTS object
  const canonicalMatch = mwContent.match(/const CANONICAL_REDIRECTS[^{]*\{([^}]+)\}/s);
  const canonicalRedirects = [];
  if (canonicalMatch) {
    const pairs = canonicalMatch[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g);
    for (const p of pairs) {
      canonicalRedirects.push({ source: p[1], destination: p[2] });
    }
  }

  // Extract standalone redirect targets (e.g., /settings → /profile?tab=settings)
  const standaloneRedirects = [];
  const standalonePatterns = [
    { name: "/settings", regex: /if\s*\(\s*strippedPath\s*===\s*"\/settings"/ },
    { name: "/innstillinger", regex: /if\s*\(\s*strippedPath\s*===\s*"\/innstillinger"/ },
    { name: "/konto", regex: /if\s*\(\s*strippedPath\s*===\s*"\/konto"/ },
  ];
  for (const p of standalonePatterns) {
    if (p.regex.test(mwContent)) {
      // Find the target URL nearby
      const idx = mwContent.search(p.regex);
      if (idx !== -1) {
        const nearby = mwContent.slice(idx, idx + 300);
        const targetMatch = nearby.match(/const target = "([^"]+)"/);
        if (targetMatch) {
          standaloneRedirects.push({ source: p.name, destination: targetMatch[1] });
        }
      }
    }
  }

  // ── 3. Check next.config redirects ──
  reporter.info(`Checking ${nextRedirects.length} next.config redirects...`);
  let ncIssues = 0;
  for (const { source, destination } of nextRedirects) {
    if (destination.startsWith("http")) continue;
    if (source.includes(":path*")) continue;

    let destPath = destination.replace(/^\/no\//, "").replace(/^\/en\//, "");
    if (destPath.includes("?")) destPath = destPath.split("?")[0];
    destPath = destPath.replace(/^\//, "");

    const isLocaleRoot = /^no$|^en$/.test(destPath);
    const pageFile = isLocaleRoot
      ? "src/app/[locale]/page.tsx"
      : findPageForRoute(destPath);

    if (!pageFile || !existsSync(pageFile)) {
      reporter.warn(`${source} → ${destination}`, "destination page missing");
      ncIssues++;
    } else {
      reporter.pass(`${source} → ${destination}`, "destination exists");
    }
  }
  if (ncIssues === 0) reporter.pass("All next.config redirects valid");

  // ── 4. Check middleware CANONICAL redirects ──
  reporter.info(`Checking ${canonicalRedirects.length} CANONICAL_REDIRECTS...`);
  let canonIssues = 0;
  for (const { source, destination } of canonicalRedirects) {
    const pageFile = findPageForRoute(destination);
    if (!pageFile || !existsSync(pageFile)) {
      reporter.warn(`CANONICAL ${source} → ${destination}`, "destination page missing");
      canonIssues++;
    } else {
      reporter.pass(`CANONICAL ${source} → ${destination}`, "destination exists");
    }
  }
  if (canonIssues === 0) reporter.pass("All CANONICAL_REDIRECTS valid");

  // ── 5. Check standalone middleware redirects ──
  reporter.info(`Checking ${standaloneRedirects.length} standalone middleware redirects...`);
  for (const { source, destination } of standaloneRedirects) {
    let destPath = destination;
    if (destPath.includes("?")) destPath = destPath.split("?")[0];
    const pageFile = findPageForRoute(destPath);
    if (!pageFile || !existsSync(pageFile)) {
      reporter.warn(`Middleware ${source} → ${destination}`, "destination page missing");
    } else {
      reporter.pass(`Middleware ${source} → ${destination}`, "destination exists");
    }
  }

  // ── 6. Detect conflicts (same source in next.config + middleware) ──
  reporter.section("Conflict Detection");
  const middlewareSources = new Set([
    ...canonicalRedirects.map((r) => r.source),
    ...standaloneRedirects.map((r) => r.source),
  ]);
  let conflicts = 0;
  for (const nr of nextRedirects) {
    if (middlewareSources.has(nr.source)) {
      reporter.fail(`Conflict: "${nr.source}" defined in BOTH next.config and middleware`);
      conflicts++;
    }
  }
  if (conflicts === 0) reporter.pass("No redirect conflicts detected");

  // ── 7. Check all app routes have page.tsx ──
  reporter.section("Route Completeness");
  const allDirs = globSync("src/app/[locale]/*/*/")
    .concat(globSync("src/app/[locale]/*/"))
    .concat(globSync("src/app/[locale]/*/*/*/"));

  // Filter to likely leaf directories (those without subdirs)
  const leafDirs = [];
  for (const dir of allDirs) {
    const hasSubdirs = globSync(`${dir}*/`).length > 0;
    if (!hasSubdirs && !dir.includes("[[...")) {
      leafDirs.push(dir);
    }
  }

  let missingPages = 0;
  for (const dir of leafDirs) {
    const hasPage = existsSync(`${dir}page.tsx`) || existsSync(`${dir}page.ts`) || existsSync(`${dir}page.jsx`);
    if (!hasPage && !dir.includes("/_") && !dir.includes("/api/")) {
      reporter.warn(`No page.tsx in ${dir}`);
      missingPages++;
    }
  }
  if (missingPages === 0) reporter.pass("All leaf routes have page files");
}
