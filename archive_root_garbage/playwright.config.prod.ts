import { defineConfig } from '@playwright/test';

/**
 * Playwright config for PRODUCTION testing
 * 
 * Tester mot: https://www.klarpakke.no
 * 
 * Hva testes:
 * - Kritiske sider gir 200 (ikke 404)
 * - Redirects fungerer (når deployet)
 */

export default defineConfig({
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'https://www.klarpakke.no',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'prod-chromium', use: { browserName: 'chromium' } },
  ],
  // Kjør tester som IKKE har @dev tag (dvs. kjør kun prod-tester)
  grepInvert: /@dev/,
});
