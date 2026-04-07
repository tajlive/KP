import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/critical",
  testMatch: "10-trades-prod.spec.ts",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["allure-playwright"]],
  use: {
    baseURL: "https://www.klarpakke.no",
    trace: "on",
    screenshot: "on",
    video: "retain-on-failure",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
