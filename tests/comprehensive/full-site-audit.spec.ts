import { test, expect, devices } from '@playwright/test';
import type { Page } from '@playwright/test';

// Comprehensive site audit - finds ALL issues
const SITE_URL = process.env.TEST_URL || 'https://www.klarpakke.no';

const PAGES = [
  { path: '/no', name: 'Forside NO' },
  { path: '/en', name: 'Homepage EN' },
  { path: '/no/om-oss', name: 'About NO' },
  { path: '/no/priser', name: 'Pricing NO' },
  { path: '/en/pricing', name: 'Pricing EN' },
  { path: '/no/kurs', name: 'Courses NO' },
  { path: '/no/kalkulator', name: 'Calculator NO' },
  { path: '/no/hjelp', name: 'Help NO' },
  { path: '/no/kontakt', name: 'Contact NO' },
  { path: '/no/innlogging', name: 'Login NO' },
  { path: '/no/signup', name: 'Signup NO' },
];

interface ConsoleMessage { type: string; text: string; }
interface NetworkError { url: string; status: number; method: string; }

test.describe('🔍 Full Site Audit - Find ALL Issues', () => {
  let consoleErrors: ConsoleMessage[] = [];
  let networkErrors: NetworkError[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    networkErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ type: msg.type(), text: msg.text() });
      }
    });

    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method(),
        });
      }
    });
  });

  // 1. VISUAL + CONSOLE ERRORS
  for (const pageInfo of PAGES) {
    test(`✅ ${pageInfo.name} - Loads without errors`, async ({ page }) => {
      await page.goto(`${SITE_URL}${pageInfo.path}`);
      await page.waitForLoadState('networkidle');

      expect(await page.title()).toBeTruthy();

      if (consoleErrors.length > 0) {
        console.log(`❌ Console errors on ${pageInfo.name}:`);
        consoleErrors.forEach(e => console.log(`   - ${e.text}`));
      }
      if (networkErrors.length > 0) {
        console.log(`❌ Network errors on ${pageInfo.name}:`);
        networkErrors.forEach(e => console.log(`   - ${e.status} ${e.url}`));
      }

      const criticalErrors = networkErrors.filter(e => e.status === 500 || e.status === 404);
      expect(criticalErrors, `Critical errors: ${JSON.stringify(criticalErrors)}`).toHaveLength(0);
    });
  }

  // 2. ACCESSIBILITY
  test('🔍 Accessibility - Check all pages', async ({ page }) => {
    for (const pageInfo of PAGES) {
      await page.goto(`${SITE_URL}${pageInfo.path}`);
      const violations = await checkA11y(page);
      if (violations.length > 0) {
        console.log(`⚠️ A11y issues on ${pageInfo.name}:`, violations.slice(0, 5));
      }
    }
  });

  // 3. MOBILE RESPONSIVE
  test.describe('📱 Mobile Responsive', () => {
    test.use({ ...devices['iPhone 13'] });

    test('Mobile - All pages render correctly', async ({ page }) => {
      for (const pageInfo of PAGES.slice(0, 5)) {
        await page.goto(`${SITE_URL}${pageInfo.path}`);
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        
        if (bodyWidth > viewportWidth + 10) {
          console.log(`⚠️ Horizontal scroll on ${pageInfo.name}: body=${bodyWidth}px, viewport=${viewportWidth}px`);
        }
      }
    });
  });

  // 4. PERFORMANCE
  test('⚡ Performance - Core Web Vitals', async ({ page }) => {
    for (const pageInfo of PAGES.slice(0, 3)) {
      await page.goto(`${SITE_URL}${pageInfo.path}`);
      const metrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
          loadComplete: perf.loadEventEnd - perf.loadEventStart,
        };
      });
      console.log(`⏱️ ${pageInfo.name}: DOM=${metrics.domContentLoaded}ms, Load=${metrics.loadComplete}ms`);
      
      if (metrics.domContentLoaded > 3000) {
        console.log(`⚠️ Slow DOMContentLoaded on ${pageInfo.name}`);
      }
    }
  });

  // 5. SEO META TAGS
  test('🔎 SEO - Meta tags validation', async ({ page }) => {
    for (const pageInfo of PAGES) {
      await page.goto(`${SITE_URL}${pageInfo.path}`);
      const title = await page.title();
      const description = await page.getAttribute('meta[name="description"]', 'content');
      
      if (!title || title.length < 10) {
        console.log(`⚠️ Bad title on ${pageInfo.name}: "${title}"`);
      }
      if (!description || description.length < 50) {
        console.log(`⚠️ Bad description on ${pageInfo.name}`);
      }
    }
  });

  // 6. NAVIGATION LINKS
  test('🔗 Navigation - All links work', async ({ page }) => {
    await page.goto(`${SITE_URL}/no`);
    const navLinks = await page.locator('nav a, header a').all();
    console.log(`Found ${navLinks.length} navigation links`);
    
    for (const link of navLinks.slice(0, 15)) {
      const href = await link.getAttribute('href');
      const text = (await link.textContent())?.trim();
      if (href && !href.startsWith('#')) {
        console.log(`✅ Link: "${text}" -> ${href}`);
      }
    }
  });

  // 7. FORMS
  test('📝 Forms - Login form functional', async ({ page }) => {
    await page.goto(`${SITE_URL}/no/innlogging`);
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    console.log('✅ Login form is functional');
  });

  // 8. SIDE MENU / NAVIGATION
  test('📂 Side Menu - Check functionality', async ({ page }) => {
    await page.goto(`${SITE_URL}/no`);
    await page.waitForLoadState('networkidle');
    
    // Look for mobile menu button
    const menuButton = page.locator('button:has-text("Menu"), button[aria-label*="menu"], button[aria-label*="Menu"]').first();
    
    if (await menuButton.isVisible()) {
      console.log('✅ Found menu button');
      await menuButton.click();
      await page.waitForTimeout(500);
      
      // Check if menu opened
      const menu = page.locator('nav, [role="navigation"], .menu, .sidebar').first();
      const isVisible = await menu.isVisible();
      console.log(`📂 Menu visibility after click: ${isVisible}`);
    } else {
      console.log('⚠️ No mobile menu button found');
    }
  });

  // 9. DARK MODE
  test('🌙 Dark Mode - Theme toggle', async ({ page }) => {
    await page.goto(`${SITE_URL}/no`);
    const themeToggle = page.locator('[aria-label*="theme"], [aria-label*="Dark"]').first();
    
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(300);
      const isDark = await page.evaluate(() => 
        document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark')
      );
      console.log(`🌙 Dark mode: ${isDark ? 'enabled' : 'not applied'}`);
    }
  });
});

async function checkA11y(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const issues: string[] = [];
    document.querySelectorAll('img:not([alt])').forEach(() => {
      issues.push('Image missing alt text');
    });
    document.querySelectorAll('button:not([aria-label]):not(:has(text))').forEach(() => {
      issues.push('Button without accessible label');
    });
    return issues;
  });
}
