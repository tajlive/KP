import { type Page, expect } from '@playwright/test';

/**
 * Test utilities for Klarpakke E2E tests
 */

/**
 * Wait for the app to be fully loaded
 */
export async function waitForAppReady(page: Page) {
  // Wait for main app container (klarpakke-app uses flex h-screen)
  await page.waitForSelector('.h-screen, #root > div', { timeout: 10000 });

  // Wait for sidebar or navigation to be visible
  await page.waitForSelector('aside, nav, [role="navigation"]', { timeout: 5000 }).catch(() => {
    // Sidebar might be collapsed or different layout
  });
}

/**
 * Open mobile menu if not visible
 */
export async function openMobileMenu(page: Page) {
  const menuButton = page.locator('button').filter({ hasText: /menu/i }).first();
  if (await menuButton.isVisible()) {
    await menuButton.click();
    await page.waitForTimeout(300); // Wait for menu animation
  }
}

/**
 * Navigate to a feature by clicking sidebar item
 */
export async function navigateToFeature(page: Page, featureName: string) {
  // Check if menu is visible, if not open it
  const sidebar = page.locator('nav, aside, [role="navigation"]').first();
  const isVisible = await sidebar.isVisible().catch(() => false);

  if (!isVisible) {
    await openMobileMenu(page);
  }

  // Click feature
  const featureButton = page.locator(`button:has-text("${featureName}"), a:has-text("${featureName}")`).first();
  await featureButton.click();
  await page.waitForTimeout(500); // Wait for transition
}

/**
 * Check if AI mock is available
 */
export async function isAIMockAvailable(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return typeof (window as unknown).mockWebflowAPI !== 'undefined';
  });
}

/**
 * Mock Webflow API for testing
 */
export async function mockWebflowAPI(page: Page) {
  await page.addInitScript(() => {
    (window as unknown).webflow = {
      designer: {
        getSiteInfo: async () => ({
          id: 'test-site-id',
          name: 'Test Site',
          shortName: 'test',
        }),
        pages: {
          getAll: async () => [
            { id: 'home', title: 'Home', slug: '/', draft: false },
            { id: 'about', title: 'About', slug: '/about', draft: false },
            { id: 'contact', title: 'Contact', slug: '/contact', draft: true },
          ],
        },
      },
    };
  });
}

/**
 * Take screenshot with timestamp
 */
export async function takeTimestampedScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true
  });
}

/**
 * Wait for element with retry
 */
export async function waitForElementWithRetry(
  page: Page,
  selector: string,
  options?: { timeout?: number; retries?: number }
) {
  const timeout = options?.timeout || 5000;
  const retries = options?.retries || 3;

  for (let i = 0; i < retries; i++) {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (err) {
      if (i === retries - 1) throw err;
      await page.waitForTimeout(1000);
    }
  }
  return false;
}

/**
 * Check console for errors
 */
export async function checkConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  return errors;
}

/**
 * Test data factory
 */
export const testData = {
  user: {
    email: 'test@klarpakke.com',
    password: 'TestPassword123!',
  },
  site: {
    name: 'Test Klarpakke Site',
    url: 'https://test.webflow.io',
  },
  page: {
    title: 'Test Page',
    slug: '/test-page',
  },
};
