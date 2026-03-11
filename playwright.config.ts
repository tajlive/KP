import { defineConfig, devices } from '@playwright/test';

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
 */

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : undefined,
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
    ['allure-playwright', {
      outputFolder: 'allure-results',
      detail: true,
      suiteTitle: true,
      categories: [
        { name: 'Product Bugs', matchedStatuses: ['failed'], messageRegex: '.*product.*|.*bug.*|.*regression.*' },
        { name: 'Auth Failures', matchedStatuses: ['failed'], messageRegex: '.*401.*|.*403.*|.*Unauthorized.*|.*auth.*' },
        { name: 'API Failures', matchedStatuses: ['failed'], messageRegex: '.*500.*|.*502.*|.*503.*|.*API.*' },
        { name: 'Network/Timeout', matchedStatuses: ['failed'], messageRegex: '.*timeout.*|.*network.*|.*ETIMEDOUT.*' },
        { name: 'Flaky Tests', matchedStatuses: ['failed'], messageRegex: '.*flaky.*|.*retry.*|.*intermittent.*' },
        { name: 'Environment Issues', matchedStatuses: ['failed'], messageRegex: '.*env.*|.*setup.*|.*fixture.*' },
      ]
    }],
    process.env.CI ? ['github', { outputFile: 'test-summary.md' }] : ['line'],
    ['json', { outputFile: 'test-results.json' }]
  ],
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    testIdAttribute: 'data-testid',
  },

  projects: [
    // Setup: Cache auth state
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup'
    },
    
    // Cleanup
    {
      name: 'cleanup',
      testMatch: /.*\.teardown\.ts/
    },
    
    // ============================================
    // SMOKE TESTS (Blocking, always run first)
    // ============================================
    {
      name: 'smoke-chromium',
      testMatch: /smoke\/.*\.spec\.ts/,
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    
    // ============================================
    // CRITICAL TESTS (Blocking, core journeys)
    // ============================================
    {
      name: 'critical-chromium',
      testMatch: /critical\/.*\.spec\.ts/,
      use: { 
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup'],
    },
    {
      name: 'critical-firefox',
      testMatch: /critical\/.*\.spec\.ts/,
      use: { 
        ...devices['Desktop Firefox'],
        storageState: '.auth/user.json'
      },
      dependencies: ['setup'],
    },
    
    // ============================================
    // REGRESSION TESTS (Full coverage, non-blocking initially)
    // ============================================
    {
      name: 'regression-chromium',
      testMatch: /regression\/.*\.spec\.ts/,
      use: { 
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup'],
    },
    
    // ============================================
    // MOBILE TESTS (Non-blocking, device coverage)
    // ============================================
    {
      name: 'mobile-safari',
      testMatch: /mobile\/.*\.spec\.ts/,
      use: {
        ...devices['iPhone 13'],
        storageState: '.auth/user.json'
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      testMatch: /mobile\/.*\.spec\.ts/,
      use: {
        ...devices['Pixel 5'],
        storageState: '.auth/user.json'
      },
      dependencies: ['setup'],
    },
  ],

  // Local dev server (not used in CI - we test against preview/prod)
  webServer: process.env.CI || process.env.TEST_AGAINST_PROD 
    ? undefined 
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
