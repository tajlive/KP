import type { PlaywrightTestConfig } from "@playwright/test";

/**
 * Dedikert config KUN for innlogging (auth.setup.ts).
 *
 * Hovedconfigen (playwright.allure.config.ts) har testMatch "*.spec.ts" —
 * auth.setup.ts er IKKE en spec og matches ikke → "No tests found" i CI
 * (påvist 2026-08-09, e2e-smoke-auth-prod feilet på første kjøring).
 * Denne configen matcher *.setup.ts og kjøres som eget steg før smoke-testene
 * slik at e2e/.auth/user.json genereres.
 */
const config: PlaywrightTestConfig = {
  testDir: "./e2e",
  testMatch: "auth.setup.ts",
  timeout: 120000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["line"]],
  use: {
    actionTimeout: 15000,
    baseURL: process.env.TEST_BASE_URL || "https://www.klarpakke.no",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
};

export default config;
