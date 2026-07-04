/**
 * Authenticated Cockpit screenshot generator for the fixed test user Viking_NO.
 *
 * Usage:
 *   node scripts/cockpit-screenshot.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local.
 * The target test account is hard-coded below by design; this script is intended
 * for support/admin preview of the test user only. For arbitrary users, a
 * consent or temporary-credential flow is required (see docs/cockpit-preview-uiux-final.md).
 */
import { chromium } from 'playwright';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
dotenv.config({ path: path.join(repoRoot, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.COCKPIT_PREVIEW_USER_EMAIL || 'viking.no@klarpakke.test';
const password = process.env.COCKPIT_PREVIEW_USER_PASSWORD || 'VikingTestPass123!';
const baseUrl = process.env.COCKPIT_PREVIEW_BASE_URL || 'https://www.klarpakke.no';
const outputDir = process.env.COCKPIT_PREVIEW_OUTPUT_DIR || path.join(repoRoot, 'tmp', 'cockpit-reports');
const jobId = process.env.COCKPIT_PREVIEW_JOB_ID || `manual-${Date.now()}`;
const targetUserId = process.env.COCKPIT_PREVIEW_TARGET_USER_ID || 'Viking_NO';
const cookieName = 'sb-pskhryjzkobytnfwucrb-auth-token';

async function main() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  fs.mkdirSync(outputDir, { recursive: true });

  // 1. Password-grant login via Supabase
  const authUrl = `${supabaseUrl}/auth/v1/token?grant_type=password`;
  const loginRes = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = await loginRes.json();
  if (!loginRes.ok) {
    throw new Error(`Supabase auth failed: ${loginRes.status} ${loginRes.statusText} - ${JSON.stringify(loginBody)}`);
  }
  const accessToken = loginBody.access_token;
  const refreshToken = loginBody.refresh_token;
  if (!accessToken) {
    throw new Error(`No access_token returned: ${JSON.stringify(loginBody)}`);
  }

  // 2. Build cookie payload: JSON with access_token and refresh_token
  const cookiePayload = JSON.stringify({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: loginBody.token_type || 'bearer',
    expires_in: loginBody.expires_in || 3600,
    expires_at: loginBody.expires_at || Math.floor(Date.now() / 1000) + 3600,
    user: loginBody.user,
  });
  const encodedCookie = encodeURIComponent(cookiePayload);

  // 3. Launch browser and set cookie
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const baseHostname = new URL(baseUrl).hostname;
  const cookieDomain = baseHostname.includes('.') ? `.${baseHostname}` : baseHostname;

  await context.addCookies([{
    name: cookieName,
    value: encodedCookie,
    domain: cookieDomain,
    path: '/',
    httpOnly: false,
    secure: true,
    sameSite: 'Lax',
  }]);

  // 4. Navigate to /no/handel and wait for the cockpit tab UI
  await page.goto(`${baseUrl}/no/handel`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  // Wait for any of the known cockpit tabs to appear
  await page.waitForSelector('[data-testid="cockpit-tab-overview"]', { timeout: 30_000 });
  // Allow charts/data to settle
  await page.waitForTimeout(2000);

  const results = [];

  async function captureTab(name, selectorToWait) {
    if (selectorToWait) {
      await page.waitForSelector(selectorToWait, { timeout: 30_000 });
      await page.waitForTimeout(1000);
    }
    const fileName = `${jobId}-${name}.png`;
    const filePath = path.join(outputDir, fileName);
    await page.screenshot({ path: filePath, fullPage: true });
    const stats = fs.statSync(filePath);
    const dimensions = await page.evaluate(() => ({
      width: document.body.scrollWidth,
      height: document.body.scrollHeight,
    }));
    const result = { tab: name, fileName, filePath, size: stats.size, dimensions };
    results.push(result);
    console.log(`Captured ${name}: ${filePath} (${result.size} bytes, ${result.dimensions.width}x${result.dimensions.height})`);
  }

  // 5. Capture overview tab
  await captureTab('oversikt', '[data-testid="cockpit-tab-overview"]');

  // 6. Click other tabs if they exist
  const tabs = [
    { name: 'handler', value: 'trades', selector: '[data-testid="cockpit-tab-trades"]' },
    { name: 'analyse', value: 'analysis', selector: '[data-testid="cockpit-tab-analysis"]' },
  ];
  for (const tab of tabs) {
    try {
      const el = await page.locator(tab.selector).first();
      if (await el.count() > 0) {
        await el.click();
        await page.waitForTimeout(1000);
        await captureTab(tab.name, tab.selector);
      } else {
        console.log(`Tab ${tab.name} not found; skipping.`);
      }
    } catch (err) {
      console.log(`Tab ${tab.name} capture failed: ${err.message}`);
    }
  }

  await browser.close();

  // 7. Write manifest for the upload step
  const manifest = {
    jobId,
    targetUserId,
    baseUrl,
    generatedAt: new Date().toISOString(),
    files: results,
  };
  const manifestPath = path.join(outputDir, 'report-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Manifest written: ${manifestPath}`);
}

main().catch(err => {
  console.error('Cockpit screenshot failed:', err.message);
  process.exit(1);
});
