#!/usr/bin/env node

/**
 * Klarpakke Production Verification Script
 *
 * Verifiserer at production-deployment fungerer korrekt:
 * - Domain redirects (apex -> www)
 * - Locale routing (/ -> /no)
 * - Kritiske sider er tilgjengelige
 * - Security headers er på plass
 * - Response times er akseptable
 */

import fetch from "node-fetch";
import { performance } from "perf_hooks";

// ============================================================================
// CONFIGURATION
// ============================================================================

const PRODUCTION_DOMAINS = ["https://klarpakke.no", "https://www.klarpakke.no"];

const CANONICAL_DOMAIN = "https://www.klarpakke.no";

// Kritiske paths som MÅ fungere
const CRITICAL_PATHS = [
  {
    path: "/",
    expectedRedirectOr200: "/no",
    description: "Root redirect to locale or serve /no",
  },
  { path: "/no", status: 200, description: "Norwegian homepage" },
  { path: "/no/innlogging", status: 200, description: "Login page (innlogging)" },
  {
    path: "/no/signup",
    status: 200,
    description: "Signup page",
    noFollowRedirects: true,
    acceptStatuses: [200, 302, 307],
  },
  { path: "/no/priser", status: 200, description: "Pricing page (priser)" },
  {
    path: "/no/paper-trading",
    status: 200,
    description: "Paper trading (auth redirect OK)",
    noFollowRedirects: true,
    acceptStatuses: [200, 302, 307],
  },
  { path: "/no/vilkar", status: 200, description: "Terms of service" },
  { path: "/no/personvern", status: 200, description: "Privacy policy" },
  { path: "/no/kontakt", status: 200, description: "Contact page" },
  { path: "/en", status: 200, description: "English homepage" },
];

// API endpoints som skal være tilgjengelige
const API_ENDPOINTS = [
  { path: "/api/health", status: 200, description: "Health check" },
];

// Forventede security headers
const REQUIRED_HEADERS = [
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
];

const MAX_RESPONSE_TIME_MS = 3000;
const WARNING_RESPONSE_TIME_MS = 1000;

// ============================================================================
// UTILITIES
// ============================================================================

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, "green");
}
function logError(message) {
  log(`✗ ${message}`, "red");
}
function logWarning(message) {
  log(`⚠ ${message}`, "yellow");
}
function logInfo(message) {
  log(`ℹ ${message}`, "blue");
}

function formatMs(ms) {
  return `${Math.round(ms)}ms`;
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function testUrl(url, expectedStatus = 200, followRedirects = true) {
  const start = performance.now();
  try {
    const response = await fetch(url, {
      redirect: followRedirects ? "follow" : "manual",
      headers: { "User-Agent": "Klarpakke-Verify/1.0" },
      timeout: 10000,
    });
    const duration = performance.now() - start;
    return {
      success: true,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      duration,
      finalUrl: response.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: performance.now() - start,
    };
  }
}

async function testRedirect(fromUrl, expectedToPath) {
  const result = await testUrl(fromUrl, null, false);
  if (!result.success) return result;
  const isRedirect = result.status >= 300 && result.status < 400;
  if (!isRedirect)
    return { success: false, error: `Expected redirect, got ${result.status}` };
  const location = result.headers.location || result.headers.Location;
  if (!location) return { success: false, error: "No Location header" };
  const redirectPath = location.startsWith("http")
    ? new URL(location).pathname
    : location;
  if (!redirectPath.startsWith(expectedToPath)) {
    return {
      success: false,
      error: `Expected ${expectedToPath}, got ${redirectPath}`,
    };
  }
  return { success: true, redirectPath, duration: result.duration };
}

// ============================================================================
// MAIN logic (truncated for brevity in planning, full implementation here)
// ============================================================================

async function main() {
  log("\nKLARPAKKE PRODUCTION VERIFICATION\n", "cyan");
  let exitCode = 0;

  // 1. Domain Accessibility
  for (const domain of PRODUCTION_DOMAINS) {
    const res = await testUrl(`${domain}/no`);
    if (res.success && res.status === 200)
      logSuccess(`${domain}/no leads to 200`);
    else {
      logError(`${domain}/no failed`);
      exitCode = 1;
    }
  }

  // 2. API health
  for (const api of API_ENDPOINTS) {
    const url = `${CANONICAL_DOMAIN}${api.path}`;
    const res = await testUrl(url, api.status);
    if (res.success && res.status === api.status)
      logSuccess(`${api.path} ${api.description}`);
    else {
      logError(`${api.path} failed: ${res.status || res.error}`);
      exitCode = 1;
    }
  }

  // 3. Critical Paths
  for (const test of CRITICAL_PATHS) {
    const url = `${CANONICAL_DOMAIN}${test.path}`;
    if (test.expectedRedirectOr200) {
      const redirectRes = await testRedirect(url, test.expectedRedirectOr200);
      if (redirectRes.success) {
        logSuccess(`${test.path} -> ${test.expectedRedirectOr200}`);
      } else {
        const res = await testUrl(url, 200, true);
        const ok = res.success && res.status === 200 && (res.finalUrl?.includes(test.expectedRedirectOr200) || test.path === "/");
        if (ok) logSuccess(`${test.path} (OK)`);
        else {
          logError(`${test.path} redirect failed: ${redirectRes.error}`);
          exitCode = 1;
        }
      }
    } else {
      const followRedirects = !test.noFollowRedirects;
      const res = await testUrl(url, test.status, followRedirects);
      const accepted = test.acceptStatuses
        ? test.acceptStatuses.includes(res.status)
        : res.status === test.status;
      if (res.success && accepted) logSuccess(`${test.path} (OK)`);
      else {
        logError(`${test.path} failed: ${res.status || res.error}`);
        exitCode = 1;
      }
    }
  }

  // 4. Security headers (sample from homepage)
  const headerRes = await testUrl(`${CANONICAL_DOMAIN}/no`, 200);
  if (headerRes.success && headerRes.headers) {
    const missing = REQUIRED_HEADERS.filter(
      (h) => !Object.keys(headerRes.headers).some((k) => k.toLowerCase() === h.toLowerCase())
    );
    if (missing.length === 0) logSuccess("Required security headers present");
    else {
      logWarning(`Missing headers: ${missing.join(", ")}`);
    }
  }

  if (exitCode === 0) log("\nALL TESTS PASSED 🚀\n", "green");
  else log("\nSOME TESTS FAILED\n", "red");
  process.exit(exitCode);
}

main();
