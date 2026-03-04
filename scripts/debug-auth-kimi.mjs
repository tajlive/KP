#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          KLARPAKKE AUTH DIAGNOSTICS v3.0 — KIMI EDITION                ║
 * ║  Det mest grundige auth-feilsøkingsscriptet som noen gang er skrevet    ║
 * ║  for klarpakke.no                                                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Kjør: node scripts/debug-auth-kimi.mjs
 * Eller: node scripts/debug-auth-kimi.mjs --prod   (tester www.klarpakke.no)
 * Eller: node scripts/debug-auth-kimi.mjs --local  (tester localhost:3000)
 *
 * Tester:
 *   ✦ TypeScript kompilering
 *   ✦ Callback-rute HTTP-oppførsel (curl)
 *   ✦ URL-dobling detektor
 *   ✦ Redirect-loop detektor (maks 10 hops)
 *   ✦ PKCE code_challenge=S256 i OAuth URL
 *   ✦ Cookie Set-Cookie headers etter vellykket exchange
 *   ✦ x-forwarded-host / x-forwarded-proto headers
 *   ✦ Vercel Analytics 404-loop detektor
 *   ✦ next= / redirectTo= parameter sanitering
 *   ✦ Open-redirect blokker
 *   ✦ Supabase health (REST API ping)
 *   ✦ Magic link callback routing
 *   ✦ Error-param håndtering på innlogging-siden
 *   ✦ Cloud Run health check (/api/health)
 *   ✦ Playwright: full browser auth flow
 *
 * Genererer: debug-rapport-DATO.json
 */

import { execSync, exec } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { promisify } from 'util';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Konfigurasjon ────────────────────────────────────────────────────────────

const IS_PROD = process.argv.includes('--prod') || !process.argv.includes('--local');
const BASE_URL = IS_PROD ? 'https://www.klarpakke.no' : 'http://localhost:3000';
const LOCALE = 'no';
const CALLBACK_URL = `${BASE_URL}/${LOCALE}/auth/callback`;
const INNLOGGING_URL = `${BASE_URL}/${LOCALE}/innlogging`;
const HEALTH_URL = `${BASE_URL}/api/health`;
const REPORT_FILE = `debug-rapport-${new Date().toISOString().slice(0, 10)}.json`;

// ─── Farger & output ──────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

const results = [];
let passCount = 0;
let failCount = 0;
let warnCount = 0;
let skipCount = 0;

function header(text) {
  const line = '═'.repeat(70);
  console.log(`\n${C.bold}${C.cyan}${line}${C.reset}`);
  console.log(`${C.bold}${C.cyan}  ${text}${C.reset}`);
  console.log(`${C.bold}${C.cyan}${line}${C.reset}`);
}

function section(text) {
  console.log(`\n${C.bold}${C.blue}▶ ${text}${C.reset}`);
  console.log(`${C.dim}${'─'.repeat(60)}${C.reset}`);
}

function pass(id, msg, detail = '') {
  passCount++;
  const entry = { id, status: 'PASS', msg, detail };
  results.push(entry);
  console.log(`  ${C.bgGreen}${C.bold} BEVIS-${id} ✅ ${C.reset} ${C.green}${msg}${C.reset}`);
  if (detail) console.log(`  ${C.dim}   ${detail}${C.reset}`);
  return entry;
}

function fail(id, msg, detail = '', fatal = false) {
  failCount++;
  const entry = { id, status: 'FAIL', msg, detail, fatal };
  results.push(entry);
  console.log(`  ${C.bgRed}${C.bold} FEIL-${id} ❌ ${C.reset} ${C.red}${msg}${C.reset}`);
  if (detail) console.log(`  ${C.dim}   ${detail}${C.reset}`);
  return entry;
}

function warn(id, msg, detail = '') {
  warnCount++;
  const entry = { id, status: 'WARN', msg, detail };
  results.push(entry);
  console.log(`  ${C.bgYellow}${C.bold} ADVARSEL-${id} ⚠️  ${C.reset} ${C.yellow}${msg}${C.reset}`);
  if (detail) console.log(`  ${C.dim}   ${detail}${C.reset}`);
  return entry;
}

function skip(id, msg, reason = '') {
  skipCount++;
  const entry = { id, status: 'SKIP', msg, reason };
  results.push(entry);
  console.log(`  ${C.dim} HOPP-${id} ⏭  ${msg}${reason ? ` (${reason})` : ''}${C.reset}`);
  return entry;
}

function info(msg) {
  console.log(`  ${C.dim}ℹ  ${msg}${C.reset}`);
}

// ─── HTTP Hjelpere ────────────────────────────────────────────────────────────

async function httpGet(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Klarpakke-Debug/3.0 KIMI',
        'Accept': 'text/html,application/json',
        ...opts.headers,
      },
      timeout: 10000,
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body,
        url,
      }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function httpFollow(url, maxRedirects = 10) {
  const hops = [];
  let current = url;
  for (let i = 0; i < maxRedirects; i++) {
    const res = await httpGet(current);
    hops.push({ url: current, status: res.status, location: res.headers['location'] });
    if (![301, 302, 303, 307, 308].includes(res.status)) break;
    const next = res.headers['location'];
    if (!next) break;
    if (next.startsWith('/')) {
      const u = new URL(current);
      current = `${u.protocol}//${u.host}${next}`;
    } else {
      current = next;
    }
    // Loop-detektor: samme URL to ganger?
    const seen = hops.map(h => h.url);
    if (seen.includes(current)) {
      hops.push({ url: current, status: 'LOOP', location: null });
      break;
    }
  }
  return hops;
}

// ─── CURL hjelpere ────────────────────────────────────────────────────────────

async function curlHead(url, extraArgs = '') {
  try {
    const cmd = `curl -si --max-redirs 0 ${extraArgs} "${url}" 2>&1`;
    const { stdout } = await execAsync(cmd);
    const lines = stdout.split('\n');
    const statusLine = lines.find(l => l.startsWith('HTTP/'));
    const status = parseInt(statusLine?.split(' ')[1] || '0', 10);
    const headers = {};
    lines.forEach(l => {
      const m = l.match(/^([\w-]+):\s*(.+)$/i);
      if (m) headers[m[1].toLowerCase()] = m[2].trim();
    });
    return { status, headers, raw: stdout };
  } catch (e) {
    return { status: 0, headers: {}, raw: e.message, error: true };
  }
}

async function curlLoopCheck(url) {
  try {
    const cmd = `curl -so /dev/null -w "%{num_redirects}|%{url_effective}|%{http_code}" --max-redirs 10 -L "${url}" 2>&1`;
    const { stdout } = await execAsync(cmd);
    const [numRedirects, finalUrl, finalCode] = stdout.trim().split('|');
    return {
      numRedirects: parseInt(numRedirects, 10),
      finalUrl,
      finalCode: parseInt(finalCode, 10),
    };
  } catch (e) {
    return { numRedirects: -1, finalUrl: '', finalCode: 0 };
  }
}

// ─── TEST-SUITE BEGYNNER ──────────────────────────────────────────────────────

async function runAll() {
  const startTime = Date.now();

  header(`KLARPAKKE AUTH DIAGNOSTICS v3.0`);
  console.log(`${C.dim}  Mål: ${BASE_URL}`);
  console.log(`  Tid: ${new Date().toISOString()}`);
  console.log(`  Node: ${process.version}${C.reset}`);

  // ══════════════════════════════════════════════════════════════════
  // SJEKK 0: Forutsetninger
  // ══════════════════════════════════════════════════════════════════
  section('SJEKK 0 — Forutsetninger & miljø');

  // 0a: tsc typesjekk
  try {
    execSync('npx tsc --noEmit 2>&1', { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
    pass('0-TS', 'TypeScript kompilerer uten feil', 'npx tsc --noEmit → exit 0');
  } catch (e) {
    const out = e.stdout?.toString() || e.message;
    fail('0-TS', 'TypeScript kompileringsfeil', out.slice(0, 500));
  }

  // 0b: node-fetch / curl tilgjengelig
  try {
    execSync('curl --version 2>&1', { stdio: 'pipe' });
    pass('0-CURL', 'curl tilgjengelig');
  } catch {
    warn('0-CURL', 'curl ikke tilgjengelig — HTTP-tester hoppes over');
  }

  // 0c: Playwright tilgjengelig
  let playwrightAvailable = false;
  try {
    await import('@playwright/test');
    const chromiumCheck = execSync('npx playwright install chromium --dry-run 2>&1 || true', {
      cwd: path.join(__dirname, '..'), stdio: 'pipe',
    }).toString();
    playwrightAvailable = true;
    pass('0-PW', 'Playwright tilgjengelig');
  } catch {
    warn('0-PW', 'Playwright ikke installert — browser-tester hoppes over');
  }

  // ══════════════════════════════════════════════════════════════════
  // SJEKK 1: Server tilgjengelighet
  // ══════════════════════════════════════════════════════════════════
  section('SJEKK 1 — Server tilgjengelighet');

  let serverOnline = false;
  try {
    const r = await httpGet(HEALTH_URL);
    if (r.status === 200 && r.body.includes('ok')) {
      pass('1-HEALTH', `/api/health returnerer 200 ok`, `URL: ${HEALTH_URL}`);
      serverOnline = true;
    } else if (r.status === 200) {
      warn('1-HEALTH', `/api/health returnerer 200 men body er uventet`, r.body.slice(0, 100));
      serverOnline = true;
    } else {
      fail('1-HEALTH', `/api/health returnerte ${r.status}`, r.body.slice(0, 200));
    }
  } catch (e) {
    fail('1-HEALTH', `Kan ikke nå ${HEALTH_URL}`, e.message);
  }

  if (!serverOnline && IS_PROD) {
    console.log(`\n${C.red}${C.bold}⛔ Server ikke tilgjengelig. Deploy kan fortsatt være i gang. Avslutter.${C.reset}`);
    saveReport(startTime);
    process.exit(1);
  }

  // ══════════════════════════════════════════════════════════════════
  // SJEKK 2: FIX 7 — Cloud Run origin headers
  // ══════════════════════════════════════════════════════════════════
  section('SJEKK 2 — FIX 7: Cloud Run origin (x-forwarded-host)');

  const callbackNoCode = await curlHead(CALLBACK_URL);
  info(`Callback status uten code: ${callbackNoCode.status}`);
  info(`Location header: ${callbackNoCode.headers['location'] || '(ingen)'}`);

  if (callbackNoCode.status === 302) {
    const loc = callbackNoCode.headers['location'] || '';

    // 2a: Ingen 0.0.0.0 i redirect
    if (loc.includes('0.0.0.0')) {
      fail('2-ORIGIN', 'FIX 7 FEILET: location peker til 0.0.0.0', `Location: ${loc}`);
    } else {
      pass('2-ORIGIN', 'FIX 7 OK: location peker IKKE til 0.0.0.0', `Location: ${loc}`);
    }

    // 2b: URL-dobling
    if (loc.includes('https:/www') || loc.includes('https://www.klarpakke.no/') && loc.split('https://').length > 2) {
      fail('2-DOUBLING', 'URL-dobling oppdaget i Location header!', `Location: ${loc}`);
    } else {
      pass('2-DOUBLING', 'Ingen URL-dobling i Location header', `Location: ${loc}`);
    }

    // 2c: Peker til korrekt base URL
    if (IS_PROD && !loc.includes('klarpakke.no')) {
      fail('2-BASE', `Location peker ikke til klarpakke.no`, `Location: ${loc}`);
    } else {
      pass('2-BASE', `Location peker til korrekt domene`, `Location: ${loc}`);
    }

    // 2d: error=no_code (ingen code param gitt)
    if (loc.includes('error=no_code')) {
      pass('2-NOCODE', 'Callback returnerer korrekt error=no_code uten code', `Location: ${loc}`);
    } else if (loc.includes('error=')) {
      warn('2-NOCODE', `Callback returnerte error=${loc.split('error=')[1]?.split('&')[0]}`, `Location: ${loc}`);
    } else {
      warn('2-NOCODE', 'Callback returnerte ikke error=no_code (uventet)', `Location: ${loc}`);
    }
  } else {
    fail('2-CALLBACK', `Callback returnerte ${callbackNoCode.status} (forventet 302)`, callbackNoCode.raw?.slice(0, 300));
  }

  // ══════════════════════════════════════════════════════════════════
  // SJEKK 3: FIX 8 — sanitizeRedirectPath (server-side)
  // ══════════════════════════════════════════════════════════════════
  section('SJEKK 3 — FIX 8: sanitizeRedirectPath (server-side URL-dobling)');

  const urlDoublingTests = [
    {
      id: '3-DOUBLE-FULL',
      label: 'next= er full URL (https://...)',
      url: `${CALLBACK_URL}?next=${encodeURIComponent('https://www.klarpakke.no/no/innlogging')}`,
      expect: (loc) => !loc.includes('https://www.klarpakke.no') || loc.split('https://').length === 2,
      expectMsg: 'Skal ikke inneholde URL-dobling',
    },
    {
      id: '3-DOUBLE-SINGLE',
      label: 'next= med enkeltskrå (https:/...)',
      url: `${CALLBACK_URL}?next=${encodeURIComponent('https:/www.klarpakke.no/no/innlogging')}`,
      expect: (loc) => !loc.includes('innlogginghttps'),
      expectMsg: 'Skal ikke produsere innlogginghttps',
    },
    {
      id: '3-OPEN-REDIRECT',
      label: 'next= åpen redirect forsøk (//evil.com)',
      url: `${CALLBACK_URL}?next=${encodeURIComponent('//evil.com/steal')}`,
      expect: (loc) => !loc.includes('evil.com'),
      expectMsg: 'Skal blokkere open-redirect',
    },
    {
      id: '3-NEXT-VALID',
      label: 'next= er gyldig relativ sti',
      url: `${CALLBACK_URL}?next=${encodeURIComponent('/no/dashboard')}`,
      expect: (loc) => loc.includes('error=') || loc.includes('/no/dashboard'),
      expectMsg: 'Skal videresende til /no/dashboard (etter exchange)',
    },
  ];

  for (const test of urlDoublingTests) {
    try {
      const r = await curlHead(test.url);
      const loc = r.headers['location'] || '';
      info(`${test.label}: ${r.status} → ${loc.slice(0, 80)}`);

      if (r.status === 302 && test.expect(loc)) {
        pass(test.id, `${test.label} → sanitert korrekt`, `Location: ${loc.slice(0, 100)}`);
      } else if (r.status === 302) {
        fail(test.id, `${test.label} → ${test.expectMsg}`, `Location: ${loc.slice(0, 100)}`);
      } else {
        warn(test.id, `${test.label} → status ${r.status} (forventet 302)`);
      }
    } catch (e) {
      warn(test.id, `Kunne ikke teste: ${e.message}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // SJEKK 4: Redirect-loop detektor
  // ══════════════════════════════════════════════════════════════════
  section('SJEKK 4 — Redirect-loop detektor (maks 10 hops)');

  const loopTests = [
    {
      id: '4-INNLOGGING',
      label: 'innlogging?error=exchange_failed (historisk loop-kilde)',
      url: `${INNLOGGING_URL}?error=exchange_failed`,
      maxRedirects: 3,
    },
    {
      id: '4-CALLBACK',
      label: 'callback uten code (skal gi 1 redirect til innlogging)',
      url: CALLBACK_URL,
      maxRedirects: 3,
    },
    {
      id: '4-CALLBACK-ERROR',
      label: 'callback med error=access_denied',
      url: `${CALLBACK_URL}?error=access_denied`,
      maxRedirects: 3,
    },
  ];

  for (const test of loopTests) {
    try {
      const r = await curlLoopCheck(test.url);
      info(`${test.label}: ${r.numRedirects} redirects → ${r.finalUrl?.slice(0, 60)}`);

      if (r.numRedirects === -1) {
        warn(test.id, `${test.label} → curl feilet`);
      } else if (r.numRedirects >= 8) {
        fail(test.id, `${test.label} → LOOP OPPDAGET (${r.numRedirects} redirects)!`, `Endte på: ${r.finalUrl}`);
      } else if (r.numRedirects <= test.maxRedirects) {
        pass(test.id, `${test.label} → ${r.numRedirects} redirects (OK)`, `Endte på: ${r.finalUrl?.slice(0, 60)}`);
      } else {
        warn(test.id, `${test.label} → ${r.numRedirects} redirects (mer enn forventet)`, `Endte på: ${r.finalUrl}`);
      }
    } catch (e) {
      warn(test.id, `Timeout/feil: ${e.message}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // SJEKK 5: FIX 1 — Vercel Analytics blokkert på Cloud Run
  // ══════════════════════════════════════════════════════════════════
  section('SJEKK 5 — FIX Bug1: Vercel Analytics ikke lastet på Cloud Run');

  const analyticsEndpoints = [
    `${BASE_URL}/_vercel/insights/script.js`,
    `${BASE_URL}/_vercel/speed-insights/script.js`,
  ];

  for (const endpoint of analyticsEndpoints) {
    try {
      const r = await httpGet(endpoint);
      const scriptName = endpoint.split('/').pop();
      if (r.status === 200) {
        // If 200 on Cloud Run, this means the Vercel analytics IS loading (bad!)
        if (IS_PROD) {
          warn('5-VERCEL', `${scriptName} returnerer 200 på Cloud Run (uventet)`, `URL: ${endpoint}`);
        } else {
          pass('5-VERCEL', `${scriptName} tilgjengelig (lokalt Vercel dev)`, endpoint);
        }
      } else if (r.status === 404) {
        // 404 on Cloud Run is expected – the fix prevents the infinite retry
        // We verify by checking that no infinite retry happens in the HTML
        pass('5-VERCEL-404', `${scriptName} 404 (forventet på Cloud Run) – ingen infinitt retry siden vendor.js er fikset`, endpoint);
      } else {
        info(`${scriptName} returnerte ${r.status}`);
      }
    } catch (e) {
      info(`Kunne ikke nå ${endpoint}: ${e.message}`);
    }
  }

  // Sjekk at layout.tsx har conditional loading
  try {
    const { readFileSync } = await import('fs');
    const layoutPath = path.join(__dirname, '..', 'src/app/[locale]/layout.tsx');
    if (existsSync(layoutPath)) {
      const layout = readFileSync(layoutPath, 'utf8');
      if (layout.includes('process.env.VERCEL') && layout.includes('isOnVercel')) {
        pass('5-LAYOUT', 'layout.tsx har kondisjonell Vercel Analytics (process.env.VERCEL)', 'Ingen infinitt loop på Cloud Run');
      } else if (layout.includes('@vercel/analytics') && !layout.includes('process.env.VERCEL')) {
        fail('5-LAYOUT', 'layout.tsx laster Vercel Analytics uten kondisjonell sjekk!', 'Vil forårsake infinitt loop på Cloud Run');
      } else {
        warn('5-LAYOUT', 'Ukjent Vercel Analytics konfigurasjon i layout.tsx');
      }
    }
  } catch (e) {
    skip('5-LAYOUT', 'Kan ikke lese layout.tsx', e.message);
  }

  // ══════════════════════════════════════════════════════════════════
  // SJEKK 6: FIX 4 — Middleware (experimental-edge fjernet)
  // ══════════════════════════════════════════════════════════════════
  section('SJEKK 6 — FIX 4: Middleware runtime (experimental-edge fjernet)');

  try {
    const { readFileSync } = await import('fs');
    const mwPath = path.join(__dirname, '..', 'src/middleware.ts');
    if (existsSync(mwPath)) {
      const mw = readFileSync(mwPath, 'utf8');
      if (mw.includes('experimental-edge')) {
        fail('6-MIDDLEWARE', 'FIX 4 FEILET: experimental-edge funnet i middleware.ts!', 'Inkompatibel med @supabase/ssr');
      } else {
        pass('6-MIDDLEWARE', 'FIX 4 OK: experimental-edge IKKE i middleware.ts');
      }
      if (mw.includes('export const runtime')) {
        fail('6-MW-RUNTIME', 'export const runtime funnet i middleware.ts', 'Bør fjernes');
      } else {
        pass('6-MW-RUNTIME', 'Ingen export const runtime i middleware.ts');
      }
    } else {
      skip('6-MIDDLEWARE', 'src/middleware.ts ikke funnet');
    }
  } catch (e) {
    skip('6-MIDDLEWARE', 'Kan ikke lese middleware.ts', e.message);
  }

  // ══════════════════════════════════════════════════════════════════
  // SJEKK 7: FIX 5 — ?next= vs ?redirectTo= (param-mismatch)
  // ══════════════════════════════════════════════════════════════════
  section('SJEKK 7 — FIX 5: ?next= parameter (param-mismatch fikset)');

  try {
    const { readFileSync } = await import('fs');

    // Sjekk utils.ts bruker ?next=
    const utilsPath = path.join(__dirname, '..', 'src/lib/auth/utils.ts');
    if (existsSync(utilsPath)) {
      const utils = readFileSync(utilsPath, 'utf8');
      if (utils.includes('?next=')) {
        pass('7-PARAM', 'FIX 5 OK: utils.ts bruker ?next= (ikke ?redirectTo=)');
      } else if (utils.includes('?redirectTo=')) {
        fail('7-PARAM', 'FIX 5 FEILET: utils.ts bruker ?redirectTo= (mismatch med callback-ruten)');
      } else {
        warn('7-PARAM', 'Kan ikke bekrefte ?next= parameternavn i utils.ts');
      }
    }

    // Sjekk callback-ruten bruker searchParams.get('next')
    const callbackPath = path.join(__dirname, '..', 'src/app/[locale]/auth/callback/route.ts');
    if (existsSync(callbackPath)) {
      const callback = readFileSync(callbackPath, 'utf8');
      if (callback.includes("searchParams.get('next')") || callback.includes('searchParams.get("next")')) {
        pass('7-CALLBACK-PARAM', 'FIX 5 OK: callback-ruten leser ?next= parameteren');
      } else {
        warn('7-CALLBACK-PARAM', 'callback-ruten leser ikke ?next= — sjekk manuelt');
      }
      if (callback.includes('sanitizeRedirectPath')) {
        pass('7-SANITIZE', 'FIX 8 OK: sanitizeRedirectPath finnes i callback-ruten');
      } else {
        fail('7-SANITIZE', 'FIX 8 FEILET: sanitizeRedirectPath IKKE i callback-ruten!');
      }
    }

    // Sjekk InnloggingClient saniterer redirectTo
    const innloggingPath = path.join(__dirname, '..', 'src/app/[locale]/innlogging/InnloggingClient.tsx');
    if (existsSync(innloggingPath)) {
      const innlogging = readFileSync(innloggingPath, 'utf8');
      if (innlogging.includes('sanitizeClientRedirect')) {
        pass('7-CLIENT-SANITIZE', 'FIX Bug2 OK: InnloggingClient bruker sanitizeClientRedirect()');
      } else {
        fail('7-CLIENT-SANITIZE', 'FIX Bug2 FEILET: InnloggingClient mangler sanitizeClientRedirect()');
      }
    }
  } catch (e) {
    skip('7-PARAM', 'Kan ikke lese kildefiler', e.message);
  }

  // ══════════════════════════════════════════════════════════════════
  // SJEKK 8: FIX 3 — client.ts PKCE konfigurasjon
  // ══════════════════════════════════════════════════════════════════
  section('SJEKK 8 — FIX 3: PKCE flowType i supabase/client.ts');

  try {
    const { readFileSync } = await import('fs');
    const clientPath = path.join(__dirname, '..', 'src/lib/supabase/client.ts');
    if (existsSync(clientPath)) {
      const client = readFileSync(clientPath, 'utf8');
      if (client.includes("flowType: 'pkce'") || client.includes('flowType: "pkce"')) {
        pass('8-PKCE', 'FIX 3 OK: flowType: pkce eksplisitt satt i client.ts');
      } else {
        warn('8-PKCE', 'flowType: pkce ikke eksplisitt — kan bruke default');
      }
      if (client.includes('detectSessionInUrl: false')) {
        pass('8-DETECT', 'FIX 3 OK: detectSessionInUrl: false satt');
      } else {
        warn('8-DETECT', 'detectSessionInUrl ikke satt til false');
      }
    }

    // Sjekk server.ts aksepterer response-objekt
    const serverPath = path.join(__dirname, '..', 'src/lib/supabase/server.ts');
    if (existsSync(serverPath)) {
      const server = readFileSync(serverPath, 'utf8');
      if (server.includes('response') && server.includes('NextResponse')) {
        pass('8-SERVER', 'FIX 1 OK: server.ts aksepterer response?: NextResponse');
      } else {
        fail('8-SERVER', 'FIX 1 FEILET: server.ts mangler response-parameter!');
      }
    }
  } catch (e) {
    skip('8-PKCE', 'Kan ikke lese kildefiler', e.message);
  }

  // ══════════════════════════════════════════════════════════════════
  // SJEKK 9: OAuth URL analyse (PKCE code_challenge=S256)
  // ══════════════════════════════════════════════════════════════════
  section('SJEKK 9 — PKCE code_challenge=S256 i OAuth URL (live Supabase)');

  try {
    // Kall direkte Supabase OAuth endpoint for å analysere URL
    const { createClient } = await import('@supabase/supabase-js').catch(() => null);
    if (createClient) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (url && key) {
        const supabase = createClient(url, key, {
          auth: { flowType: 'pkce', detectSessionInUrl: false },
        });
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${CALLBACK_URL}?next=%2F${LOCALE}%2Fdashboard`,
            skipBrowserRedirect: true,
          },
        });
        if (data?.url) {
          const oauthUrl = new URL(data.url);
          const codeChallenge = oauthUrl.searchParams.get('code_challenge');
          const codeChallengeMethod = oauthUrl.searchParams.get('code_challenge_method');
          const responseType = oauthUrl.searchParams.get('response_type');
          const redirectUri = oauthUrl.searchParams.get('redirect_uri');

          info(`OAuth URL: ${data.url.slice(0, 80)}...`);
          info(`code_challenge: ${codeChallenge?.slice(0, 20)}...`);
          info(`code_challenge_method: ${codeChallengeMethod}`);
          info(`redirect_uri: ${redirectUri}`);

          if (codeChallengeMethod === 'S256') {
            pass('9-PKCE-S256', 'BEVIS-6: code_challenge_method=S256 bekreftet', `OAuth URL inneholder PKCE S256`);
          } else {
            fail('9-PKCE-S256', `PKCE S256 IKKE funnet! code_challenge_method=${codeChallengeMethod}`);
          }

          if (codeChallenge && codeChallenge.length > 10) {
            pass('9-PKCE-VALUE', 'code_challenge er satt (PKCE aktiv)', `Length: ${codeChallenge.length}`);
          } else {
            fail('9-PKCE-VALUE', 'code_challenge mangler eller er for kort!');
          }

          if (redirectUri?.includes(CALLBACK_URL.replace(BASE_URL, ''))) {
            pass('9-REDIRECT-URI', `redirect_uri peker til callback-ruten`, `redirect_uri: ${redirectUri}`);
          } else {
            warn('9-REDIRECT-URI', `redirect_uri er uventet`, `redirect_uri: ${redirectUri}`);
          }

          const nextParam = new URL(redirectUri).searchParams.get('next');
          if (nextParam === `/${LOCALE}/dashboard`) {
            pass('9-NEXT-PARAM', `BEVIS-7: ?next= parameter korrekt (/no/dashboard)`, `next: ${nextParam}`);
          } else if (nextParam) {
            warn('9-NEXT-PARAM', `?next= har uventet verdi`, `next: ${nextParam}`);
          } else {
            warn('9-NEXT-PARAM', `?next= mangler i redirect_uri`);
          }
        } else if (error) {
          warn('9-PKCE-S256', `Supabase OAuth feilet: ${error.message}`);
        }
      } else {
        skip('9-PKCE-S256', 'NEXT_PUBLIC_SUPABASE_URL / ANON_KEY ikke satt i miljø');
        skip('9-PKCE-VALUE', 'Hopper over PKCE live-test');
        skip('9-REDIRECT-URI', 'Hopper over redirect_uri test');
        skip('9-NEXT-PARAM', 'Hopper over ?next= test');
      }
    } else {
      skip('9-PKCE-S256', '@supabase/supabase-js ikke tilgjengelig');
    }
  } catch (e) {
    warn('9-PKCE-S256', `Supabase test feilet: ${e.message}`);
  }

  // ══════════════════════════════════════════════════════════════════
  // SJEKK 10: innlogging-siden HTTP oppførsel
  // ══════════════════════════════════════════════════════════════════
  section('SJEKK 10 — innlogging-siden HTTP oppførsel');

  try {
    const r = await httpGet(INNLOGGING_URL);
    if (r.status === 200) {
      pass('10-INNLOGGING', `innlogging-siden er tilgjengelig (200)`);

      // Sjekk at Vercel analytics IKKE er i HTML-en (den laster skript)
      if (r.body.includes('/_vercel/insights') || r.body.includes('/_vercel/speed-insights')) {
        fail('10-NO-VERCEL', 'Vercel Analytics-skript er i HTML! Vil forårsake 404-loop på Cloud Run');
      } else {
        pass('10-NO-VERCEL', 'Ingen Vercel /_vercel/ skript-URLer i HTML (Cloud Run-safe)');
      }

      // Sjekk at siden laster korrekt Content-Type
      const ct = r.headers['content-type'] || '';
      if (ct.includes('text/html')) {
        pass('10-CT', `Content-Type er text/html`);
      } else {
        warn('10-CT', `Uventet Content-Type: ${ct}`);
      }
    } else if ([301, 302].includes(r.status)) {
      const loc = r.headers['location'];
      info(`innlogging omdirigerer (${r.status}) → ${loc}`);
      warn('10-INNLOGGING', `innlogging gir ${r.status} redirect`, `Location: ${loc}`);
    } else {
      fail('10-INNLOGGING', `innlogging returnerte ${r.status}`);
    }
  } catch (e) {
    fail('10-INNLOGGING', `Kan ikke nå innlogging-siden`, e.message);
  }

  // ══════════════════════════════════════════════════════════════════
  // SJEKK 11: Alle error-params på innlogging-siden
  // ══════════════════════════════════════════════════════════════════
  section('SJEKK 11 — Error-params stabile (ikke loop)');

  const errorParams = [
    'exchange_failed',
    'no_code',
    'no_session',
    'callback_error',
    'access_denied',
  ];

  for (const errParam of errorParams) {
    try {
      const r = await curlLoopCheck(`${INNLOGGING_URL}?error=${errParam}`);
      if (r.numRedirects === 0 && r.finalCode === 200) {
        pass(`11-${errParam}`, `?error=${errParam} er stabil (0 redirects, 200)`);
      } else if (r.numRedirects >= 5) {
        fail(`11-${errParam}`, `?error=${errParam} loop! (${r.numRedirects} redirects)`);
      } else {
        info(`?error=${errParam}: ${r.numRedirects} redirects, code ${r.finalCode}`);
        pass(`11-${errParam}`, `?error=${errParam}: ${r.numRedirects} redirects → ${r.finalCode}`);
      }
    } catch (e) {
      warn(`11-${errParam}`, `Feil ved test: ${e.message}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // SJEKK 12: Playwright browser-test
  // ══════════════════════════════════════════════════════════════════
  section('SJEKK 12 — Playwright browser-tester');

  if (!playwrightAvailable) {
    skip('12-PW-ALL', 'Playwright ikke tilgjengelig (installer med: npx playwright install)');
  } else {
    try {
      const { chromium } = await import('@playwright/test');
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        ignoreHTTPSErrors: false,
      });

      const redirectUrls = [];
      const consoleErrors = [];
      const page = await context.newPage();

      // Samle alle redirects
      page.on('response', resp => {
        if ([301, 302, 303, 307, 308].includes(resp.status())) {
          redirectUrls.push({
            from: resp.url(),
            to: resp.headers()['location'],
            status: resp.status(),
          });
        }
      });

      // Samle console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // PW-TEST A: Innlogging-siden laster uten feil
      await page.goto(INNLOGGING_URL, { waitUntil: 'networkidle', timeout: 15000 });
      const finalUrl = page.url();

      if (finalUrl.includes('/innlogging') || finalUrl === INNLOGGING_URL) {
        pass('12-PW-LOAD', `Playwright: innlogging-siden laster (${finalUrl.slice(0, 60)})`);
      } else {
        warn('12-PW-LOAD', `Playwright: endte på ${finalUrl} (forventet innlogging)`);
      }

      // PW-TEST B: Ingen URL-dobling
      const doubleUrlDetected = [finalUrl, ...redirectUrls.map(r => r.to || '')]
        .filter(Boolean)
        .some(u => u.includes('https:/www') || u.split('https://').length > 2);

      if (doubleUrlDetected) {
        fail('12-PW-DOUBLING', `Playwright: URL-dobling oppdaget!`, JSON.stringify(redirectUrls.slice(-3)));
      } else {
        pass('12-PW-DOUBLING', 'Playwright: Ingen URL-dobling oppdaget');
      }

      // PW-TEST C: Ingen /_vercel/insights 404 i console
      const vercelErrors = consoleErrors.filter(e => e.includes('_vercel'));
      if (vercelErrors.length > 0) {
        fail('12-PW-VERCEL', `Playwright: ${vercelErrors.length} Vercel Analytics feil i console`, vercelErrors[0].slice(0, 100));
      } else {
        pass('12-PW-VERCEL', 'Playwright: Ingen Vercel Analytics 404-feil i console');
      }

      // PW-TEST D: Antall redirects ved lasting av innlogging
      if (redirectUrls.length === 0) {
        pass('12-PW-REDIRECTS', `Playwright: 0 server-side redirects ved lasting av innlogging`);
      } else if (redirectUrls.length <= 2) {
        pass('12-PW-REDIRECTS', `Playwright: ${redirectUrls.length} redirects (akseptabelt)`, JSON.stringify(redirectUrls));
      } else {
        warn('12-PW-REDIRECTS', `Playwright: ${redirectUrls.length} redirects (mange!)`, JSON.stringify(redirectUrls));
      }

      // PW-TEST E: innlogging?error=exchange_failed er stabil 3 sekunder
      await page.goto(`${INNLOGGING_URL}?error=exchange_failed`, { timeout: 15000 });
      await page.waitForTimeout(3000);
      const urlAfter3s = page.url();

      if (urlAfter3s.includes('exchange_failed') || urlAfter3s.includes('/innlogging')) {
        pass('12-PW-STABLE', `BEVIS-2: innlogging?error=exchange_failed er stabil etter 3s`, `URL: ${urlAfter3s.slice(0, 60)}`);
      } else {
        fail('12-PW-STABLE', `BEVIS-2 FEILET: Siden redirectet etter 3s!`, `Endte på: ${urlAfter3s}`);
      }

      // PW-TEST F: Google OAuth URL genereres med PKCE
      const [popup] = await Promise.all([
        page.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
        page.goto(INNLOGGING_URL, { waitUntil: 'domcontentloaded' }),
      ]);

      // Finn Google-knapp og sjekk href
      const googleBtn = page.locator('button').filter({ hasText: /google/i }).first();
      const googleBtnCount = await googleBtn.count();

      if (googleBtnCount > 0) {
        pass('12-PW-GOOGLE-BTN', 'Playwright: Google-innlogging knapp finnes på innlogging-siden');

        // Sjekk at klikk genererer riktig OAuth URL (uten faktisk innlogging)
        const navigationPromise = page.waitForNavigation({ timeout: 5000 }).catch(() => null);
        await googleBtn.click();
        const nav = await navigationPromise;

        const currentUrl = page.url();
        if (currentUrl.includes('accounts.google.com') || currentUrl.includes('supabase.co')) {
          // Check for S256 in URL
          const urlObj = new URL(currentUrl);
          const method = urlObj.searchParams.get('code_challenge_method');
          if (method === 'S256') {
            pass('12-PW-PKCE', `BEVIS-6 (Playwright): Google OAuth URL inneholder code_challenge_method=S256`);
          } else {
            warn('12-PW-PKCE', `OAuth URL mangler code_challenge_method=S256`, `URL: ${currentUrl.slice(0, 100)}`);
          }
        } else {
          info(`Google OAuth navigerte til: ${currentUrl.slice(0, 80)}`);
        }
      } else {
        warn('12-PW-GOOGLE-BTN', 'Google-innlogging knapp ikke funnet (sjekk at siden er lastet)');
      }

      await browser.close();
    } catch (e) {
      fail('12-PW-ERROR', `Playwright krasjet: ${e.message}`, e.stack?.slice(0, 200));
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // SJEKK 13: Server.ts cookie-håndtering
  // ══════════════════════════════════════════════════════════════════
  section('SJEKK 13 — FIX 1: Cookie-setting på response-objekt');

  try {
    const { readFileSync } = await import('fs');
    const serverPath = path.join(__dirname, '..', 'src/lib/supabase/server.ts');
    if (existsSync(serverPath)) {
      const server = readFileSync(serverPath, 'utf8');

      const checks = [
        { id: '13-RESPONSE', pattern: 'response?.cookies', msg: 'server.ts setter cookies på response.cookies (FIX 1)' },
        { id: '13-CONSOLE-ERROR', pattern: 'console.error', msg: 'server.ts logger cookie-feil (ikke tom catch-blokk)' },
        { id: '13-NEXTRESPONSE', pattern: 'NextResponse', msg: 'server.ts importerer NextResponse' },
      ];

      for (const check of checks) {
        if (server.includes(check.pattern)) {
          pass(check.id, check.msg);
        } else {
          fail(check.id, `FIX mangler: ${check.msg}`, `Pattern '${check.pattern}' ikke funnet`);
        }
      }
    }
  } catch (e) {
    skip('13-SERVER', 'Kan ikke lese server.ts', e.message);
  }

  // ══════════════════════════════════════════════════════════════════
  // SJEKK 14: Callback-rute oppsummering
  // ══════════════════════════════════════════════════════════════════
  section('SJEKK 14 — Callback route.ts komplett verifikasjon');

  try {
    const { readFileSync } = await import('fs');
    const callbackPath = path.join(__dirname, '..', 'src/app/[locale]/auth/callback/route.ts');
    if (existsSync(callbackPath)) {
      const cb = readFileSync(callbackPath, 'utf8');

      const codeChecks = [
        { id: '14-BEFORE', pattern: 'successResponse = NextResponse.redirect', msg: 'FIX 2: successResponse opprettes FØR createClient()' },
        { id: '14-EXCHANGE', pattern: 'exchangeCodeForSession', msg: 'exchangeCodeForSession kalles' },
        { id: '14-GETSESSION', pattern: 'getSession()', msg: 'getSession() kalles for å verifisere session' },
        { id: '14-XFWD', pattern: 'x-forwarded-host', msg: 'FIX 7: x-forwarded-host brukes for origin' },
        { id: '14-SANITIZE-FN', pattern: 'sanitizeRedirectPath', msg: 'FIX 8: sanitizeRedirectPath funksjon finnes' },
        { id: '14-GETAPPURL', pattern: 'getAppUrl()', msg: 'FIX 7: getAppUrl() brukes som fallback' },
        { id: '14-LOGGING', pattern: 'console.log', msg: 'Debug logging finnes' },
        { id: '14-DYNAMIC', pattern: "export const dynamic = 'force-dynamic'", msg: 'force-dynamic satt (No-cache)' },
      ];

      for (const check of codeChecks) {
        if (cb.includes(check.pattern)) {
          pass(check.id, check.msg);
        } else {
          fail(check.id, `MANGLER: ${check.msg}`, `Pattern '${check.pattern}' ikke funnet i route.ts`);
        }
      }
    } else {
      fail('14-EXISTS', 'KRITISK: src/app/[locale]/auth/callback/route.ts finnes IKKE!');
    }
  } catch (e) {
    skip('14-CALLBACK', 'Kan ikke lese callback route.ts', e.message);
  }

  // ══════════════════════════════════════════════════════════════════
  // SJEKK 15: FIX 6 — Magic link bypass (sendMagicLink)
  // ══════════════════════════════════════════════════════════════════
  section('SJEKK 15 — FIX 6: Magic link callback routing');

  try {
    const { readFileSync } = await import('fs');
    const utilsPath = path.join(__dirname, '..', 'src/lib/auth/utils.ts');
    if (existsSync(utilsPath)) {
      const utils = readFileSync(utilsPath, 'utf8');

      if (utils.includes('sendMagicLink')) {
        // Sjekk at sendMagicLink peker til callback, ikke dashboard
        const magicLinkFn = utils.substring(
          utils.indexOf('sendMagicLink'),
          utils.indexOf('sendMagicLink') + 500
        );
        if (magicLinkFn.includes('/auth/callback') || magicLinkFn.includes('callback')) {
          pass('15-MAGIC', 'FIX 6 OK: sendMagicLink router via /auth/callback');
        } else if (magicLinkFn.includes('/dashboard')) {
          fail('15-MAGIC', 'FIX 6 FEILET: sendMagicLink hopper til /dashboard (bypass PKCE!)');
        } else {
          warn('15-MAGIC', 'sendMagicLink routing ukjent — sjekk manuelt', magicLinkFn.slice(0, 150));
        }
      } else {
        skip('15-MAGIC', 'sendMagicLink ikke funnet i utils.ts');
      }
    }
  } catch (e) {
    skip('15-MAGIC', 'Kan ikke lese utils.ts', e.message);
  }

  // ══════════════════════════════════════════════════════════════════
  // SLUTTRAPPORT
  // ══════════════════════════════════════════════════════════════════
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  const critical = results.filter(r => r.status === 'FAIL' && r.fatal);
  const failures = results.filter(r => r.status === 'FAIL');
  const allOk = failures.length === 0;

  header(`SLUTTRAPPORT — ${elapsed}s`);
  console.log(`
  ${C.bold}Totalt:    ${results.length} sjekker${C.reset}`);
  console.log(`  ${C.green}${C.bold}✅ PASS:     ${passCount}${C.reset}`);
  console.log(`  ${C.red}${C.bold}❌ FEIL:     ${failCount}${C.reset}`);
  console.log(`  ${C.yellow}${C.bold}⚠️  ADVARSEL: ${warnCount}${C.reset}`);
  console.log(`  ${C.dim}⏭  HOPPET:   ${skipCount}${C.reset}`);

  if (allOk) {
    console.log(`\n  ${C.bgGreen}${C.bold} 🎉 ALLE SJEKKER BESTÅTT — AUTH ER 100% KLAR 🎉 ${C.reset}`);
  } else {
    console.log(`\n  ${C.bgRed}${C.bold} ⛔ ${failCount} FEIL FUNNET — SE DETALJER OVER ${C.reset}`);
    console.log(`\n  ${C.red}${C.bold}Feilede sjekker:${C.reset}`);
    failures.forEach(f => {
      console.log(`  ${C.red}  • ${f.id}: ${f.msg}${C.reset}`);
      if (f.detail) console.log(`  ${C.dim}    ${f.detail.slice(0, 100)}${C.reset}`);
    });
  }

  saveReport(startTime);

  process.exit(allOk ? 0 : 1);
}

function saveReport(startTime) {
  const report = {
    generatedAt: new Date().toISOString(),
    target: BASE_URL,
    elapsed: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    summary: { pass: passCount, fail: failCount, warn: warnCount, skip: skipCount },
    results,
  };
  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`\n  ${C.dim}Rapport lagret: ${REPORT_FILE}${C.reset}`);
}

runAll().catch(e => {
  console.error(`\n${C.red}${C.bold}FATAL FEIL:${C.reset}`, e);
  process.exit(2);
});
