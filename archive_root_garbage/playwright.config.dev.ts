import { defineConfig } from '@playwright/test';

/**
 * Playwright config for LOCAL DEVELOPMENT testing
 * 
 * Tester mot: http://localhost:3000
 * 
 * Hva testes:
 * - Full UI (Google/Microsoft knapper)
 * - Auth flow
 * - Alle features
 * 
 * Krever: npm run dev (server må kjøre)
 */

export default defineConfig({
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: false, // Vis browser for debugging
    screenshot: 'on',
    video: 'on',
  },
  projects: [
    { name: 'dev-chromium', use: { browserName: 'chromium' } },
  ],
});
