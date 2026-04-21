#!/usr/bin/env node
/**
 * Super Editor Screenshot Tool
 *
 * Tar screenshots av sider før/etter endringer.
 * Brukes av super-editor-agenten for visuell QA.
 *
 * Bruk:
 *   node scripts/super-editor-screenshot.mjs <url> [--label=before|after] [--viewport=desktop|mobile|both]
 *   node scripts/super-editor-screenshot.mjs https://localhost:3000/no --label=before --viewport=both
 *
 * Output: .changeset/<timestamp>/<label>-<slug>-<viewport>.png
 */

import { chromium } from "playwright";
import { mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Parse args
const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith("http")) || "http://localhost:3000/no";
const labelArg = args.find((a) => a.startsWith("--label="));
const label = labelArg ? labelArg.replace("--label=", "") : "screenshot";
const viewportArg = args.find((a) => a.startsWith("--viewport="));
const viewportMode = viewportArg ? viewportArg.replace("--viewport=", "") : "both";

const viewports = [];
if (viewportMode === "desktop" || viewportMode === "both") {
  viewports.push({ name: "desktop", width: 1440, height: 900 });
}
if (viewportMode === "mobile" || viewportMode === "both") {
  viewports.push({ name: "mobile", width: 390, height: 844 });
}

const slug = new URL(url).pathname.replace(/\//g, "_") || "root";

// Find or create changeset dir
async function getChangesetDir() {
  const changesetRoot = join(ROOT, ".changeset");
  await mkdir(changesetRoot, { recursive: true });

  // Find the most recent timestamp dir, or create one
  const dirs = await readdir(changesetRoot, { withFileTypes: true });
  const dateDirs = dirs
    .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}/.test(d.name))
    .map((d) => d.name)
    .sort((a, b) => b.localeCompare(a));

  if (dateDirs.length > 0) {
    return join(changesetRoot, dateDirs[0]);
  }

  const now = new Date().toISOString().slice(0, 10);
  const dir = join(changesetRoot, now);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Injiser CSS som skjuler/fryser dynamisk innhold for konsistente screenshots.
 */
const FREEZE_CSS = `
  /* Skjul animasjoner */
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
  /* Skjul live-priser og tickers (velg basert på vanlige data-testid/klasser) */
  [data-testid="live-price"],
  [data-testid="price-ticker"],
  .ticker,
  .live-price,
  .animate-pulse,
  .animate-spin,
  .animate-bounce {
    visibility: hidden !important;
  }
  /* Skjul cookie-banners */
  [class*="cookie"],
  [class*="consent"],
  [id*="cookie"],
  [id*="consent"] {
    display: none !important;
  }
`;

async function takeScreenshot(pageUrl, viewport, outPath) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.name === "mobile" ? 3 : 1,
  });
  const page = await context.newPage();

  try {
    await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 30000 });

    // Vent på at fonter skal laste
    await page.waitForTimeout(1000);

    // Injiser freeze-CSS
    await page.addStyleTag({ content: FREEZE_CSS });

    // Vent litt til for å la layout stabilisere seg
    await page.waitForTimeout(500);

    // Ta screenshot
    await page.screenshot({
      path: outPath,
      fullPage: true,
    });

    console.log(`✅ Screenshot lagret: ${outPath}`);
  } catch (err) {
    console.error(`❌ Feil ved screenshot av ${pageUrl}:`, err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

async function main() {
  const changesetDir = await getChangesetDir();

  for (const vp of viewports) {
    const filename = `${label}-${slug}-${vp.name}.png`;
    const outPath = join(changesetDir, filename);
    await takeScreenshot(url, vp, outPath);
  }

  console.log(`\n📁 Alle screenshots lagret i: ${changesetDir}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
