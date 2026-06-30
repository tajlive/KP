import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import fs from "fs";
import os from "node:os";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

/** Absolutt sti — unngår ENOENT i workers når CWD avviker fra config-katalog. */
const e2eAuthStoragePath = path.join(repoRoot, ".auth", "user.json");

/**
 * Miljø lastes som Next.js `next dev` (lav → høy prioritet, siste vinner):
 * `.env` → `.env.development` → `.env.local` → `.env.development.local`
 * Først fylles bare hull fra `.env.production.local` (mal uten å overskrive dev).
 * Aldri sett `NODE_ENV` fra filer.
 */
function applyEnvFile(
  rel: string,
  opts: { skipNodeEnv?: boolean; fillMissingOnly?: boolean } = {},
) {
  const full = path.resolve(repoRoot, rel);
  if (!fs.existsSync(full)) return;
  const parsed = dotenv.parse(fs.readFileSync(full, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (opts.skipNodeEnv && key === "NODE_ENV") continue;
    if (opts.fillMissingOnly) {
      if (process.env[key] === undefined || process.env[key] === "") {
        process.env[key] = value;
      }
    } else {
      process.env[key] = value;
    }
  }
}

applyEnvFile(".env.production.local", {
  skipNodeEnv: true,
  fillMissingOnly: true,
});
applyEnvFile(".env", { skipNodeEnv: true });
applyEnvFile(".env.development", { skipNodeEnv: true });
applyEnvFile(".env.local", { skipNodeEnv: true });
applyEnvFile(".env.development.local", { skipNodeEnv: true });
/**
 * Lokalt: `.env.local` har ofte kun Supabase — uten E2E_USER_* feiler auth.setup (fil finnes, ingen E2E-nøkler).
 * Fyll kun hull fra repo-sporet `.env.example` (samme standard testbruker som create-test-users / AGENTS.md).
 */
applyEnvFile(".env.example", { skipNodeEnv: true, fillMissingOnly: true });
// Never force local Playwright runs to production via .env.example defaults
// Only delete if NOT in CI (CI should use the explicitly set env vars)
if (!process.env.CI) {
  delete process.env.BASE_URL;
  delete process.env.PLAYWRIGHT_TEST_BASE_URL;
}

/**
 * `scripts/full-e2e.sh` eksporterer KLARPAKKE_E2E_FROM_PROVISION=1 etter create-test-users.js.
 * Uten dette kan .env.local overskrive E2E_USER_PASSWORD med gammel verdi → setup logger aldri inn
 * mens Supabase nettopp fikk TestPassword123! fra provision.
 *
 * Må matche TEST_USERS[0] i scripts/create-test-users.js (tom@klarpakke.no / TestPassword123!).
 * Skru av: KLARPAKKE_E2E_FROM_PROVISION=0 npm run test:full
 */
if (process.env.KLARPAKKE_E2E_FROM_PROVISION === "1") {
  process.env.E2E_USER_EMAIL = "tom@klarpakke.no";
  process.env.E2E_USER_PASSWORD = "TestPassword123!";
  process.env.TEST_USER_EMAIL = "tom@klarpakke.no";
  process.env.TEST_USER_PASSWORD = "TestPassword123!";
}

/** Unngå at mange parallelle tester overvelder `next dev` (API-timeouts / flaky goto). */
function resolvePlaywrightWorkers(): number | undefined {
  if (process.env.PW_WORKERS !== undefined) {
    const n = parseInt(process.env.PW_WORKERS, 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  if (process.env.CI) return 2;
  return Math.min(2, Math.max(1, os.cpus().length));
}

/**
 * Enterprise-grade Playwright configuration for Klarpakke
 *
 * Test categories:
 * - @smoke: Critical health checks, fast, blocking
 * - @critical: Core user journeys, blocking
 * - @regression: Full feature coverage, non-blocking initially
 * - @mobile: Mobile-specific tests, non-blocking
 * - @auth: Authentication required
 * - @papertrading: Paper trading features
 * - @accessibility: axe-core WCAG-sjekk på kritiske sider
 */

export default defineConfig({
  globalSetup: "./playwright/global-setup.ts",
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: resolvePlaywrightWorkers(),
  timeout: 120_000,
  expect: {
    timeout: process.env.CI ? 15_000 : 12_000,
  },

  reporter: [
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["list"],
    [
      "allure-playwright",
      {
        outputFolder: "allure-results",
        detail: true,
        suiteTitle: true,
        categories: [
          {
            name: "Product Bugs",
            matchedStatuses: ["failed"],
            messageRegex: ".*product.*|.*bug.*|.*regression.*",
          },
          {
            name: "Auth Failures",
            matchedStatuses: ["failed"],
            messageRegex: ".*401.*|.*403.*|.*Unauthorized.*|.*auth.*",
          },
          {
            name: "API Failures",
            matchedStatuses: ["failed"],
            messageRegex: ".*500.*|.*502.*|.*503.*|.*API.*",
          },
          {
            name: "Network/Timeout",
            matchedStatuses: ["failed"],
            messageRegex: ".*timeout.*|.*network.*|.*ETIMEDOUT.*",
          },
          {
            name: "Flaky Tests",
            matchedStatuses: ["failed"],
            messageRegex: ".*flaky.*|.*retry.*|.*intermittent.*",
          },
          {
            name: "Environment Issues",
            matchedStatuses: ["failed"],
            messageRegex: ".*env.*|.*setup.*|.*fixture.*",
          },
        ],
      },
    ],
    process.env.CI ? ["github", { outputFile: "test-summary.md" }] : ["line"],
    ["json", { outputFile: "test-results.json" }],
  ],

  use: {
    baseURL:
      process.env.PLAYWRIGHT_TEST_BASE_URL ||
      process.env.BASE_URL ||
      "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    testIdAttribute: "data-testid",
  },

  projects: [
    // Setup: Cache auth state (lang flyt: flere UI-forsøk + passord-grant-fallback)
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      timeout: 720_000,
      teardown: "cleanup",
    },

    // Cleanup
    {
      name: "cleanup",
      testMatch: /.*\.teardown\.ts/,
    },

    // ============================================
    // SMOKE TESTS (Blocking, always run first)
    // ============================================
    {
      name: "smoke-chromium",
      testMatch: /smoke\/.*\.spec\.ts|landing\/landing-redesign\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // ============================================
    // LANDING PAGE TESTS (Conversion critical)
    // ============================================
    {
      name: "landing-chromium",
      testMatch: /landing\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // ============================================
    // CRITICAL TESTS (Blocking, core journeys)
    // ============================================
    {
      name: "critical-chromium",
      testMatch: /critical\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: e2eAuthStoragePath,
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ["setup"],
    },

    /** Agent/debug: papir-saldo + historikk (samme auth som critical) */
    {
      name: "debug-chromium",
      testMatch: /debug\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: e2eAuthStoragePath,
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ["setup"],
    },
    {
      name: "critical-firefox",
      testMatch: /critical\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        storageState: e2eAuthStoragePath,
      },
      dependencies: ["setup"],
    },

    // ============================================
    // SAFARI DESKTOP (WebKit, macOS)
    // ============================================
    {
      name: "smoke-webkit",
      testMatch: /smoke\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1440, height: 900 },
      },
    },

    // ============================================
    // REGRESSION TESTS (Full coverage, non-blocking initially)
    // ============================================
    {
      name: "regression-chromium",
      testMatch: /regression\/.*\.spec\.ts|trading-cockpit\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: e2eAuthStoragePath,
        viewport: { width: 1920, height: 1080 },
        navigationTimeout: 60_000,
        actionTimeout: 15_000,
      },
      dependencies: ["setup"],
    },

    // ============================================
    // MOBILE TESTS (Non-blocking, device coverage)
    // ============================================
    {
      name: "mobile-safari",
      testMatch: /mobile\/.*\.spec\.ts/,
      use: {
        ...devices["iPhone 13"],
        storageState: e2eAuthStoragePath,
      },
      dependencies: ["setup"],
    },
    {
      name: "mobile-chrome",
      testMatch: /mobile\/.*\.spec\.ts/,
      use: {
        ...devices["Pixel 5"],
        storageState: e2eAuthStoragePath,
      },
      dependencies: ["setup"],
    },
    {
      name: "landing-mobile",
      testMatch: /landing\/.*\.spec\.ts/,
      use: {
        ...devices["iPhone SE"],
        viewport: { width: 375, height: 667 },
      },
    },

    // ============================================
    // ACCESSIBILITY (axe-core WCAG)
    // ============================================
    {
      name: "a11y-chromium",
      testMatch: "**/accessibility/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: "a11y-mobile",
      testMatch: "**/accessibility/**/*.spec.ts",
      use: {
        ...devices["iPhone 13"],
      },
    },

    // ============================================
    // USER FLOWS (Critical journeys)
    // ============================================
    {
      name: "user-flows-chromium",
      testMatch: "**/critical/user-flows.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        storageState: e2eAuthStoragePath,
      },
      dependencies: ["setup"],
    },

    // ============================================
    // RESPONSIVE TESTING
    // ============================================
    {
      name: "responsive-chromium",
      testMatch: "**/responsive/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        storageState: e2eAuthStoragePath,
      },
      dependencies: ["setup"],
    },

    // ============================================
    // PERFORMANCE TESTS
    // ============================================
    {
      name: "performance-chromium",
      testMatch: "**/performance/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // ============================================
    // VISUAL REGRESSION (CSS + i18n sanity)
    // ============================================
    {
      name: "visual-regression",
      testMatch: "**/visual/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        // screenshot alltid på og på failure for diff
        screenshot: "on",
      },
    },
  ],

  // Local dev server (not used in CI or when testing against prod/external URL)
  webServer: (() => {
    // full-e2e.sh starter og eier `next dev`; å spawne en til gir port-konflikt → «webServer exited early»
    if (process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1") return undefined;
    const base = process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.BASE_URL;
    if (process.env.CI || process.env.TEST_AGAINST_PROD) return undefined;
    if (base && !base.includes("localhost")) return undefined;
    return {
      command: "npm run dev -- --port 3000",
      url: "http://localhost:3000",
      // Gjenbruk kun når eksplisitt ønsket; ellers henger E2E på en gammel dev-server uten nye /api/*-ruter (404).
      reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1",
      timeout: 180_000,
      env: {
        ...process.env,
        // Demp next-intl / webpack cache-advarsler i E2E-logg (next.config.mjs)
        PLAYWRIGHT_WEBPACK_QUIET: "1",
      },
    };
  })(),
});
