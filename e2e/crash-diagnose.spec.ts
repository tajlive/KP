import { test, expect } from '@playwright/test';

test('diagnose cloudflare page crash', async ({ page }) => {
  const errors: string[] = [];
  const logs: string[] = [];
  const failedRequests: string[] = [];
  
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    logs.push(text);
    if (msg.type() === 'error') errors.push(text);
  });
  
  page.on('pageerror', err => {
    errors.push(`[PAGEERROR] ${err.message}`);
  });
  
  page.on('requestfailed', req => {
    failedRequests.push(`${req.url()} — ${req.failure()?.errorText}`);
  });

  await page.goto('https://1c531d32.klarpakke.pages.dev/no/', { 
    waitUntil: 'networkidle', 
    timeout: 30000 
  });
  
  await page.waitForTimeout(5000);
  
  // Output everything
  console.log('\n=== TITLE ===');
  console.log(await page.title());
  
  console.log('\n=== CONSOLE LOGS (first 30) ===');
  logs.slice(0, 30).forEach(l => console.log(l));
  
  console.log('\n=== ERRORS ===');
  errors.forEach(e => console.log(e));
  
  console.log('\n=== FAILED REQUESTS ===');
  failedRequests.forEach(r => console.log(r));
  
  console.log('\n=== BODY VISIBLE TEXT (first 300 chars) ===');
  const bodyText = await page.locator('body').textContent();
  console.log(bodyText?.slice(0, 300)?.replace(/\s+/g, ' '));
  
  console.log('\n=== INTERACTIVE CHECK ===');
  const hasButton = await page.locator('button').count();
  console.log(`Buttons found: ${hasButton}`);
  
  // Soft expectations so test doesn't fail
  expect(true).toBe(true);
});
