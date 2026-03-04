// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * Tests production deployment at www.klarpakke.no
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  testIgnore: [
    '**/__tests__/**',        // Ignore Vitest unit tests
    '**/*.test.ts',           // Ignore Vitest test files
    '**/node_modules/**',
    '**/_archive/**',         // Ignore archived tests
  ],
  
  fullyParallel: false,       // Kjør sekvensielt for ikke å overbelaste prod
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                 // En worker mot prod
  timeout: 60000,             // 60s per test (increased from 30s for Vercel cold starts)
  expect: {
    timeout: 10000,           // 10s for individual assertions
  },
  
  reporter: [
    ['html', {
      outputFolder: 'playwright-report',
      open: 'never'
    }],
    ['list'],                  // Terminal-output under kjøring
    ['json', {
      outputFile: 'playwright-report/results.json'
    }],
    ['allure-playwright', {
      outputFolder: 'allure-results',
    }],
  ],
  
  use: {
    baseURL: process.env.TEST_BASE_URL || 'https://www.klarpakke.no',
    trace: 'retain-on-failure',
    screenshot: 'on',          // ALLTID ta skjermbilder, ikke bare ved feil
    video: 'retain-on-failure',
    locale: 'nb-NO',
    timezoneId: 'Europe/Oslo',
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
