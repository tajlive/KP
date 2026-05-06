#!/usr/bin/env node
/**
 * Page Inspector — Visual Site Overview
 *
 * Discovers all Next.js routes, takes screenshots, and generates
 * an HTML gallery so you can "see everything on the website" at a glance.
 *
 * Usage:
 *   node scripts/page-inspector.mjs              # Screenshot dev server
 *   node scripts/page-inspector.mjs --prod       # Screenshot production
 *   node scripts/page-inspector.mjs --url http://localhost:3001
 *   node scripts/page-inspector.mjs --routes-only # Just list routes, no screenshots
 *   node scripts/page-inspector.mjs --open        # Auto-open gallery when done
 *
 * The generated gallery is saved to:
 *   .page-inspector/gallery-{timestamp}.html
 */

import { chromium } from '@playwright/test';
import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, '.page-inspector');

// ─── CLI args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isProd = args.includes('--prod');
const customUrl = args.find((a, i) => args[i - 1] === '--url');
const routesOnly = args.includes('--routes-only');
const autoOpen = args.includes('--open');
const locale = args.find((a, i) => args[i - 1] === '--locale') || 'no';

// ─── Route Discovery ────────────────────────────────────────────────────────
function discoverRoutes(dir, base = '') {
  const routes = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('(') && entry.isDirectory()) {
      // Route groups — transparent, don't add to path
      routes.push(...discoverRoutes(join(dir, entry.name), base));
      continue;
    }
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
    if (entry.name === 'api') continue;

    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === '[...slug]') {
        // Catch-all — add a sample
        routes.push({ path: `${base}/sample-page`, type: 'catch-all', source: fullPath });
      } else if (entry.name.startsWith('[') && entry.name.endsWith(']')) {
        // Dynamic segment — add sample
        const paramName = entry.name.slice(1, -1);
        const sample = paramName === 'locale' ? locale :
                       paramName === 'id' ? 'demo-id' :
                       paramName === 'slug' ? 'sample-slug' : 'sample';
        routes.push(...discoverRoutes(fullPath, `${base}/${sample}`));
      } else {
        routes.push(...discoverRoutes(fullPath, `${base}/${entry.name}`));
      }
    } else if (entry.isFile() && /^page\.(tsx?|jsx?|mdx)$/.test(entry.name)) {
      const routePath = base || '/';
      routes.push({ path: routePath, type: 'page', source: fullPath });
    }
  }

  return routes;
}

function getAllRoutes() {
  const appDir = join(ROOT, 'src', 'app');
  const raw = discoverRoutes(appDir);

  // Deduplicate and normalize
  const seen = new Set();
  const routes = [];

  for (const r of raw) {
    let path = r.path;
    // Collapse locale prefix
    path = path.replace(/^\/no\b/, '').replace(/^\/en\b/, '') || '/';
    // Collapse sample values
    path = path.replace(/\/demo-id$/, '/:id').replace(/\/sample-slug$/, '/:slug');

    if (!seen.has(path)) {
      seen.add(path);
      routes.push({ ...r, path });
    }
  }

  // Sort: static first, then dynamic
  return routes.sort((a, b) => {
    const aDynamic = a.path.includes(':') || a.type === 'catch-all';
    const bDynamic = b.path.includes(':') || b.type === 'catch-all';
    if (aDynamic !== bDynamic) return aDynamic ? 1 : -1;
    return a.path.localeCompare(b.path);
  });
}

// ─── Server management ──────────────────────────────────────────────────────
function findDevServer() {
  try {
    const out = execSync('lsof -ti:3000 -sTCP:LISTEN 2>/dev/null || echo ""', { encoding: 'utf-8' });
    return out.trim() ? 'http://localhost:3000' : null;
  } catch { return null; }
}

async function startDevServer() {
  console.log('🚀 Starting dev server...');
  const child = spawn('npm', ['run', 'dev'], {
    cwd: ROOT,
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, NODE_ENV: 'development' },
  });
  child.unref();

  // Wait for server to be ready
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const res = await fetch('http://localhost:3000');
      if (res.ok) {
        console.log('✅ Dev server ready on http://localhost:3000');
        return 'http://localhost:3000';
      }
    } catch { /* retry */ }
    process.stdout.write('.');
  }
  throw new Error('Dev server failed to start within 30s');
}

// ─── Screenshot ─────────────────────────────────────────────────────────────
async function takeScreenshots(routes, baseUrl) {
  mkdirSync(OUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const screenshotDir = join(OUT_DIR, `screenshots-${timestamp}`);
  mkdirSync(screenshotDir, { recursive: true });

  console.log(`\n📸 Taking screenshots of ${routes.length} pages...\n`);

  let browser = await chromium.launch({ headless: true });
  let context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const results = [];
  let pageCounter = 0;

  for (const route of routes) {
    const url = `${baseUrl}${locale !== 'no' ? `/${locale}` : ''}${route.path === '/' ? '' : route.path}`;
    const safeName = route.path.replace(/[^a-zA-Z0-9]/g, '_') || 'root';
    const fileName = `${safeName}.png`;
    const filePath = join(screenshotDir, fileName);

    process.stdout.write(`  → ${route.path} `);

      // Restart browser every 30 pages to avoid crash
    if (pageCounter > 0 && pageCounter % 30 === 0) {
      await context.close();
      await browser.close();
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      });
      process.stdout.write('(browser restarted) ');
    }
    pageCounter++;

    try {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

      // Hide animations / dynamic content for stable screenshots
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
          }
          [data-testid="live-price"], [data-testid="ticker"],
          .ticker, .live-price, .pulse { display: none !important; }
        `,
      });

      await page.screenshot({ path: filePath, fullPage: true });
      await page.close();

      const size = statSync(filePath).size;
      results.push({ ...route, url, screenshot: filePath, size, ok: true });
      process.stdout.write(`✅ (${(size / 1024).toFixed(1)} KB)\n`);
    } catch (err) {
      results.push({ ...route, url, screenshot: null, ok: false, error: err.message });
      process.stdout.write(`❌ ${err.message.slice(0, 60)}\n`);
    }
  }

  await browser.close();
  return { results, screenshotDir, timestamp };
}

// ─── HTML Gallery ───────────────────────────────────────────────────────────
function generateGallery(results, screenshotDir, timestamp, baseUrl) {
  const total = results.length;
  const ok = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);

  const sections = {};
  for (const r of results) {
    const section = r.path === '/' ? 'Home' :
      r.path.split('/')[1]?.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase()) || 'Other';
    if (!sections[section]) sections[section] = [];
    sections[section].push(r);
  }

  const cards = Object.entries(sections).map(([section, items]) => {
    const itemCards = items.map(r => {
      const relPath = r.screenshot ? relative(OUT_DIR, r.screenshot) : '';
      const imgTag = r.screenshot
        ? `<img src="${relPath}" loading="lazy" onclick="openModal('${relPath}', '${r.path}', '${r.url}')">`
        : `<div class="no-img">❌ Failed</div>`;
      return `
        <div class="card ${r.ok ? '' : 'failed'}">
          <div class="thumb">${imgTag}</div>
          <div class="meta">
            <code class="route">${r.path}</code>
            <span class="type">${r.type}</span>
            <a href="${r.url}" target="_blank" class="open">↗ Open</a>
          </div>
        </div>`;
    }).join('');

    return `
      <section>
        <h2>${section} <span class="count">${items.length}</span></h2>
        <div class="grid">${itemCards}</div>
      </section>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Klarpakke Page Inspector — ${timestamp}</title>
  <style>
    :root { --bg: #0f172a; --surface: #1e293b; --text: #e2e8f0; --muted: #94a3b8; --accent: #38bdf8; --danger: #ef4444; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); }
    header { padding: 24px 32px; border-bottom: 1px solid #334155; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
    header h1 { margin: 0; font-size: 22px; }
    header .badge { background: var(--surface); padding: 4px 12px; border-radius: 999px; font-size: 13px; color: var(--muted); }
    header .badge.ok { color: #4ade80; }
    header .badge.fail { color: var(--danger); }
    .search { margin-left: auto; padding: 8px 14px; border-radius: 8px; border: 1px solid #334155; background: var(--surface); color: var(--text); font-size: 14px; width: 260px; }
    main { padding: 24px 32px; }
    section { margin-bottom: 32px; }
    section h2 { font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin: 0 0 16px; display: flex; align-items: center; gap: 8px; }
    .count { background: var(--surface); padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .card { background: var(--surface); border-radius: 12px; overflow: hidden; border: 1px solid #334155; transition: border-color .2s; }
    .card:hover { border-color: var(--accent); }
    .card.failed { border-color: var(--danger); opacity: .7; }
    .thumb { aspect-ratio: 16/10; background: #0b1220; overflow: hidden; cursor: zoom-in; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; object-position: top; transition: transform .3s; }
    .thumb img:hover { transform: scale(1.03); }
    .no-img { display: grid; place-items: center; height: 100%; color: var(--danger); font-size: 14px; }
    .meta { padding: 10px 14px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .route { font-size: 13px; color: var(--accent); background: #0f172a; padding: 2px 8px; border-radius: 4px; }
    .type { font-size: 11px; color: var(--muted); text-transform: uppercase; margin-left: auto; }
    .open { font-size: 12px; color: var(--muted); text-decoration: none; }
    .open:hover { color: var(--text); }
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.9); z-index: 100; place-items: center; padding: 40px; }
    .modal.active { display: grid; }
    .modal img { max-width: 90vw; max-height: 85vh; border-radius: 8px; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
    .modal .info { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: var(--surface); padding: 8px 20px; border-radius: 8px; font-size: 14px; }
    .modal .close { position: absolute; top: 20px; right: 20px; background: var(--surface); border: none; color: var(--text); padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 14px; }
  </style>
</head>
<body>
  <header>
    <h1>🔍 Page Inspector</h1>
    <span class="badge ok">${ok} OK</span>
    ${failed.length ? `<span class="badge fail">${failed.length} failed</span>` : ''}
    <span class="badge">${baseUrl}</span>
    <input class="search" type="text" placeholder="Filter routes..." oninput="filter(this.value)">
  </header>
  <main>${cards}</main>
  <div class="modal" id="modal" onclick="this.classList.remove('active')">
    <div class="info" id="modalInfo"></div>
    <button class="close">Close</button>
    <img id="modalImg" src="">
  </div>
  <script>
    function openModal(src, route, url) {
      document.getElementById('modalImg').src = src;
      document.getElementById('modalInfo').innerHTML = '<code>' + route + '</code> · <a href="' + url + '" target="_blank" style="color:#38bdf8">Open page ↗</a>';
      document.getElementById('modal').classList.add('active');
    }
    function filter(q) {
      const lower = q.toLowerCase();
      document.querySelectorAll('.card').forEach(c => {
        c.style.display = c.textContent.toLowerCase().includes(lower) ? '' : 'none';
      });
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('modal').classList.remove('active'); });
  </script>
</body>
</html>`;

  const galleryPath = join(OUT_DIR, `gallery-${timestamp}.html`);
  writeFileSync(galleryPath, html);
  return galleryPath;
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Klarpakke Page Inspector\n');

  // 1. Discover routes
  console.log('📂 Discovering routes...');
  const routes = getAllRoutes();
  console.log(`   Found ${routes.length} pages\n`);

  if (routesOnly) {
    for (const r of routes) console.log(`   ${r.path.padEnd(40)} ${r.type}`);
    return;
  }

  // 2. Determine base URL
  let baseUrl = customUrl || (isProd ? 'https://www.klarpakke.no' : null);
  if (!baseUrl) {
    baseUrl = findDevServer();
    if (!baseUrl) {
      baseUrl = await startDevServer();
    }
  }

  // 3. Take screenshots
  const { results, screenshotDir, timestamp } = await takeScreenshots(routes, baseUrl);

  // 4. Generate gallery
  const galleryPath = generateGallery(results, screenshotDir, timestamp, baseUrl);

  // 5. Report
  const ok = results.filter(r => r.ok).length;
  console.log(`\n✅ Done! ${ok}/${results.length} screenshots captured.`);
  console.log(`\n📁 Gallery: ${galleryPath}`);

  if (autoOpen) {
    execSync(`open "${galleryPath}"`);
  } else {
    console.log(`   Open with: open "${galleryPath}"`);
  }
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
