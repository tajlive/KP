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
    // Innlogget smoke (auth-dashboard-smoke.spec.ts) krever QA-bruker-sesjonen
    // som genereres av playwright.auth.config.ts-steget i CI (auth.setup.ts).
    // Uten denne rendres login-siden i stedet for dashboardet.
    storageState: "e2e/.auth/user.json",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "mobile-chrome",
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 667 },
      },
    },
  ],
};

export default config;
