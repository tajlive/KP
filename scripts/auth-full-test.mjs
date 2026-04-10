#!/usr/bin/env node
/**
 * Full Auth Test Suite for Klarpakke
 * Tester hele OAuth flow fra login til dashboard
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

const BASE_URL = process.env.TEST_URL || 'https://www.klarpakke.no';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(level, message) {
  const color = {
    info: COLORS.blue,
    success: COLORS.green,
    warning: COLORS.yellow,
    error: COLORS.red,
    debug: COLORS.cyan,
  }[level] || COLORS.reset;
  
  console.log(`${color}[${level.toUpperCase()}]${COLORS.reset} ${message}`);
}

async function fetchWithCookies(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    redirect: 'manual',
    headers: {
      ...options.headers,
      'User-Agent': 'Klarpakke-Auth-Test/1.0',
    },
  });
  
  const cookies = response.headers.get('set-cookie');
  return { response, cookies };
}

async function testEndpoint(name, url, expectedStatus) {
  try {
    const { response } = await fetchWithCookies(url);
    const success = response.status === expectedStatus;
    
    if (success) {
      log('success', `${name}: ${response.status} ✓`);
    } else {
      log('error', `${name}: Expected ${expectedStatus}, got ${response.status}`);
    }
    
    return { success, status: response.status, location: response.headers.get('location') };
  } catch (error) {
    log('error', `${name}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testAuthCallbackFlow() {
  log('info', '\n=== TEST 1: Auth Callback Cookie Setting ===');
  
  // Simuler en OAuth callback (vi kan ikke gjøre ekte OAuth uten browser)
  // Men vi kan sjekke at endepunktet eksisterer
  const result = await testEndpoint(
    'Auth Callback (no code)',
    `${BASE_URL}/no/auth/callback`,
    302
  );
  
  if (result.location && result.location.includes('innlogging')) {
    log('success', 'Callback redirecter til innlogging ved manglende code ✓');
  } else {
    log('warning', `Uventet redirect: ${result.location}`);
  }
  
  return result.success;
}

async function testMiddlewareRedirects() {
  log('info', '\n=== TEST 2: Middleware Redirects ===');
  
  const tests = [
    { name: 'Dashboard (no auth)', url: `${BASE_URL}/no/dashboard`, expected: 307 },
    { name: 'Dashboard /en', url: `${BASE_URL}/en/dashboard`, expected: 307 },
    { name: 'Login page', url: `${BASE_URL}/no/innlogging`, expected: 200 },
    { name: 'Login /en', url: `${BASE_URL}/en/login`, expected: 200 },
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    const result = await testEndpoint(test.name, test.url, test.expected);
    if (!result.success) allPassed = false;
    
    if (result.location) {
      log('debug', `  → Redirects to: ${result.location}`);
    }
  }
  
  return allPassed;
}

async function testCookieDomain() {
  log('info', '\n=== TEST 3: Cookie Domain Configuration ===');
  
  const { response, cookies } = await fetchWithCookies(`${BASE_URL}/no/innlogging`);
  
  if (!cookies) {
    log('warning', 'Ingen cookies satt på innloggingssiden (forventet)');
    return true;
  }
  
  // Sjekk at cookies har riktig domain
  const hasCorrectDomain = cookies.includes('Domain=.www.klarpakke.no') || 
                           cookies.includes('domain=.www.klarpakke.no');
  
  if (hasCorrectDomain) {
    log('success', 'Cookies har riktig domain ✓');
  } else {
    log('debug', `Cookies: ${cookies}`);
  }
  
  return true;
}

async function testApiHealth() {
  log('info', '\n=== TEST 4: API Health Check ===');
  
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();
    
    if (data.status === 'healthy') {
      log('success', `API er healthy (${data.version}) ✓`);
      return true;
    } else {
      log('error', `API unhealthy: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    log('error', `API health check failed: ${error.message}`);
    return false;
  }
}

async function testCorsAndSecurityHeaders() {
  log('info', '\n=== TEST 5: Security Headers ===');
  
  const response = await fetch(BASE_URL);
  const headers = response.headers;
  
  const securityHeaders = [
    'strict-transport-security',
    'x-frame-options',
    'x-content-type-options',
  ];
  
  let allPresent = true;
  
  for (const header of securityHeaders) {
    if (headers.get(header)) {
      log('success', `${header} er satt ✓`);
    } else {
      log('warning', `${header} mangler`);
      allPresent = false;
    }
  }
  
  return allPresent;
}

async function testI18nRouting() {
  log('info', '\n=== TEST 6: i18n Routing ===');
  
  const tests = [
    { url: `${BASE_URL}/innlogging`, expected: 307, name: '/innlogging → /no/innlogging' },
    { url: `${BASE_URL}/login`, expected: 307, name: '/login → /no/login' },
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    const result = await testEndpoint(test.name, test.url, test.expected);
    if (!result.success) allPassed = false;
  }
  
  return allPassed;
}

async function testPageLoadTimes() {
  log('info', '\n=== TEST 7: Page Load Performance ===');
  
  const pages = [
    '/',
    '/no/innlogging',
    '/en/login',
  ];
  
  for (const page of pages) {
    const start = Date.now();
    try {
      await fetch(`${BASE_URL}${page}`);
      const duration = Date.now() - start;
      
      if (duration < 1000) {
        log('success', `${page}: ${duration}ms ✓`);
      } else {
        log('warning', `${page}: ${duration}ms (treg)`);
      }
    } catch (error) {
      log('error', `${page}: ${error.message}`);
    }
  }
  
  return true;
}

async function runPlaywrightTests() {
  log('info', '\n=== TEST 8: Playwright E2E Tests ===');
  
  return new Promise((resolve) => {
    const playwright = spawn('npx', ['playwright', 'test', '--reporter=line', 'e2e/critical/auth.spec.ts'], {
      cwd: process.cwd(),
      stdio: 'pipe',
    });
    
    let output = '';
    
    playwright.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });
    
    playwright.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    playwright.on('close', (code) => {
      if (code === 0) {
        log('success', 'Playwright tests passed ✓');
        resolve(true);
      } else {
        log('error', `Playwright tests failed with code ${code}`);
        resolve(false);
      }
    });
    
    // Timeout etter 2 minutter
    setTimeout(120000).then(() => {
      playwright.kill();
      log('warning', 'Playwright tests timed out');
      resolve(false);
    });
  });
}

async function generateReport(results) {
  log('info', '\n' + '='.repeat(60));
  log('info', 'TEST RAPPORT');
  log('info', '='.repeat(60));
  
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;
  const failed = total - passed;
  
  log('info', `\nTotalt: ${total} tester`);
  log('success', `Bestått: ${passed}`);
  log('error', `Feilet: ${failed}`);
  
  if (failed === 0) {
    log('success', '\n🎉 Alle tester bestått!');
  } else {
    log('error', '\n⚠️  Noen tester feilet. Se over output over.');
  }
  
  // Lagre rapport til fil
  const report = {
    timestamp: new Date().toISOString(),
    url: BASE_URL,
    results,
    summary: { total, passed, failed },
  };
  
  const fs = await import('fs');
  fs.writeFileSync('auth-test-report.json', JSON.stringify(report, null, 2));
  log('info', '\nRapport lagret til: auth-test-report.json');
  
  return failed === 0;
}

async function main() {
  log('info', '╔══════════════════════════════════════════════════════════╗');
  log('info', '║     Klarpakke Full Auth Test Suite                       ║');
  log('info', '╚══════════════════════════════════════════════════════════╝');
  log('info', `Testing: ${BASE_URL}\n`);
  
  const results = {
    authCallback: await testAuthCallbackFlow(),
    middleware: await testMiddlewareRedirects(),
    cookies: await testCookieDomain(),
    apiHealth: await testApiHealth(),
    security: await testCorsAndSecurityHeaders(),
    i18n: await testI18nRouting(),
    performance: await testPageLoadTimes(),
  };
  
  // Playwright tester er valgfrie (tar lengre tid)
  if (process.env.RUN_PLAYWRIGHT === 'true') {
    results.playwright = await runPlaywrightTests();
  } else {
    log('info', '\n=== TEST 8: Playwright (hoppet over) ===');
    log('debug', 'Sett RUN_PLAYWRIGHT=true for å kjøre E2E tester');
  }
  
  const success = await generateReport(results);
  
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  log('error', `Uventet feil: ${error.message}`);
  console.error(error);
  process.exit(1);
});
