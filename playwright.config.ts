import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Fill missing keys from optional env files (typical: Supabase URL/anon live in
 * `.env.production.local` while `next dev` only reads `.env*.local` for development).
 * Never apply `NODE_ENV` from those files — it would break `next dev` / Edge middleware.
 */
function mergeEnvFile(rel: string, opts: { skipNodeEnv?: boolean } = {}) {
  const full = path.resolve(repoRoot, rel);
  if (!fs.existsSync(full)) return;
  const parsed = dotenv.parse(fs.readFileSync(full, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (opts.skipNodeEnv && key === "NODE_ENV") continue;
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

mergeEnvFile(".env.production.local", { skipNodeEnv: true });
mergeEnvFile(".env.development.local", { skipNodeEnv: true });
dotenv.config({
  path: path.resolve(repoRoot, ".env.local"),
  override: true,
});

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
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : undefined,
  timeout: 120_000,
  expect: {
    timeout: 10_000,
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
    // Setup: Cache auth state
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
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
      testMatch: /smoke\/.*\.spec\.ts/,
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
        storageState: ".auth/user.json",
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ["setup"],
    },
    {
      name: "critical-firefox",
      testMatch: /critical\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        storageState: ".auth/user.json",
      },
      dependencies: ["setup"],
    },

    // ============================================
    // REGRESSION TESTS (Full coverage, non-blocking initially)
    // ============================================
    {
      name: "regression-chromium",
      testMatch: /regression\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/user.json",
        viewport: { width: 1920, height: 1080 },
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
        storageState: ".auth/user.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "mobile-chrome",
      testMatch: /mobile\/.*\.spec\.ts/,
      use: {
        ...devices["Pixel 5"],
        storageState: ".auth/user.json",
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
      testMatch: /accessibility\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  // Local dev server (not used in CI or when testing against prod/external URL)
  webServer: (() => {
    const base = process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.BASE_URL;
    if (process.env.CI || process.env.TEST_AGAINST_PROD) return undefined;
    if (base && !base.includes("localhost")) return undefined;
    return {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 180_000,
      env: {
        ...process.env,
        // Demp next-intl / webpack cache-advarsler i E2E-logg (next.config.mjs)
        PLAYWRIGHT_WEBPACK_QUIET: "1",
      },
    };
  })(),
});
