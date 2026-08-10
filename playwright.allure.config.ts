import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "./e2e",
  testMatch: "*.spec.ts",
  testIgnore: "**/_archive/**",
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["line"],
    [
      "allure-playwright",
      {
        detail: true,
        outputFolder: "allure-results",
        suiteTitle: false,
      },
    ],
  ],
  use: {
    actionTimeout: 10000,
    baseURL: process.env.TEST_BASE_URL || "https://www.klarpakke.no",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      // auth-*-specs tilhører chromium-auth (innlogget, med storageState).
      // Uten denne ekskluderingen kjører auth-dashboard-smoke også på
      // chromium (uten sesjonsfil) → ENOENT-feil (2026-08-09).
      testIgnore: /auth-.*\.spec\.ts/,
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      // Innloggede tester (auth-dashboard-smoke.spec.ts) — krever sesjonsfil
      // fra playwright.auth.config.ts-steget. Kun denne profilen bruker
      // storageState; uautentiserte smoke-tester (health/landing/i18n) kjører
      // på "chromium"-profilen og skal IKKE ha en auth-fil (2026-08-09:
      // global storageState brøt e2e-smoke-prod med ENOENT).
      name: "chromium-auth",
      testMatch: /auth-.*\.spec\.ts/,
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 720 },
        storageState: ".auth/user.json",
      },
    },
    {
      name: "mobile-chrome",
      testIgnore: /auth-.*\.spec\.ts/,
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 667 },
      },
    },
  ],
};

export default config;
