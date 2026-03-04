import { defineConfig } from '@playwright/test';

/**
 * Playwright config for CI PRE-DEPLOY testing
 * 
 * Tester mot: Lokal build (out/ mappen)
 * Bruker: webServer for å serve statiske filer
 * 
 * Hva testes:
 * - Samme tester som mot produksjon
 * - Men mot det vi faktisk skal deploye (out/)
 * 
 * VIKTIG: Sikrer at vi tester NY kode, ikke gammel produksjon
 */

export default defineConfig({
  timeout: 30_000,
  retries: 2, // Flere retries i CI
  
  // Start lokal server fra build output
  webServer: {
    command: 'npx serve .vercel/output/static -l 3456',
    url: 'http://localhost:3456',
    reuseExistingServer: false, // Alltid start ny
    timeout: 60_000,
  },
  
  use: {
    baseURL: 'http://localhost:3456',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  projects: [
    { 
      name: 'ci-chromium', 
      use: { browserName: 'chromium' } 
    },
  ],
  
  // Ingen grepInvert her - kjør alle tester som fungerer lokalt
  // (men ikke @dev-tester som krever full Next.js server)
  grepInvert: /@dev/,
});
