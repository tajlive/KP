import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "https://www.klarpakke.no";
// webServer kun når testene faktisk kjører mot en lokal server.
// Før 2026-08-04 startet configen `npm run dev` selv om testene gikk mot PROD —
// pre-commit-gaten hang da i 30+ min mot en overbelastet dev-server.
const isLocalBaseURL = /localhost|127\.0\.0\.1/.test(baseURL);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 1,
  workers: 2,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
    ["allure-playwright", { outputFolder: "allure-results" }],
  ],
  timeout: 30000,
  expect: { timeout: 10000 },

  use: {
    baseURL,
    storageState: ".auth/user.json",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],

  webServer:
    process.env.CI || !isLocalBaseURL
      ? undefined
      : {
          command: "npm run dev",
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120000,
        },
});
