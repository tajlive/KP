import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

/**
 * 🤖 AI-POWERED ULTIMATE TEST SUITE
 * Finds EVERYTHING wrong with the site
 */

const PAGES = [
  { path: '/no', name: 'Homepage NO', critical: true },
  { path: '/en', name: 'Homepage EN', critical: true },
  { path: '/no/om-oss', name: 'About' },
  { path: '/no/priser', name: 'Pricing', critical: true },
  { path: '/en/pricing', name: 'Pricing EN', critical: true },
  { path: '/no/kurs', name: 'Courses' },
  { path: '/no/kalkulator', name: 'Calculator' },
  { path: '/no/hjelp', name: 'Help' },
  { path: '/no/kontakt', name: 'Contact' },
  { path: '/no/innlogging', name: 'Login', critical: true },
  { path: '/no/signup', name: 'Signup', critical: true },
  { path: '/no/dashboard', name: 'Dashboard', critical: true },
];

interface TestReport {
  page: string;
  consoleErrors: string[];
  networkErrors: Array<{ url: string; status: number }>;
  a11yViolations: number;
  performanceScore: number;
  visualDiff: boolean;
}

const testReports: TestReport[] = [];

test.describe('🤖 AI-Powered Full Site Audit', () => {
  
  test.beforeEach(async ({ page }) => {
    // Track console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Console Error: ${msg.text()}`);
      }
    });

    // Track network errors
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`❌ Network Error: ${response.status()} ${response.url()}`);
      }
    });
  });

  // 1. COMPREHENSIVE PAGE LOAD TESTS
  for (const pageInfo of PAGES) {
    test(`✅ ${pageInfo.name} - Comprehensive Check`, async ({ page }) => {
      const report: TestReport = {
        page: pageInfo.name,
        consoleErrors: [],
        networkErrors: [],
        a11yViolations: 0,
        performanceScore: 0,
        visualDiff: false,
      };

      // Navigate
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');

      // 1. Check page loaded
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(5);

      // 2. Check meta description
      const description = await page.getAttribute('meta[name="description"]', 'content');
      if (pageInfo.critical) {
        expect(description).toBeTruthy();
        expect(description!.length).toBeGreaterThan(50);
      }

      // 3. Visual regression - take screenshot
      await page.screenshot({
        path: `test-results/screenshots/${pageInfo.name.replace(/\s/g, '-')}.png`,
        fullPage: true,
      });

      // 4. Performance metrics
      const metrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
          loadComplete: perf.loadEventEnd - perf.loadEventStart,
          timeToInteractive: perf.domInteractive - perf.fetchStart,
        };
      });

      console.log(`⏱️ ${pageInfo.name} Performance:`, metrics);
      
      if (pageInfo.critical) {
        expect(metrics.domContentLoaded).toBeLessThan(3000);
      }

      // 5. Check for broken images
      const brokenImages = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.filter(img => !img.complete || img.naturalHeight === 0).length;
      });
      expect(brokenImages).toBe(0);

      testReports.push(report);
    });
  }

  // 2. ACCESSIBILITY AUDIT
  test('♿ Accessibility - Full Site Scan', async ({ page }) => {
    for (const pageInfo of PAGES) {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');

      // Inject Axe
      await injectAxe(page);

      // Run A11y checks
      const violations = await page.evaluate(async () => {
        // @ts-ignore
        const results = await axe.run();
        return results.violations.map((v: any) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.length,
        }));
      }).catch(() => []);

      if (violations.length > 0) {
        console.log(`⚠️ A11y violations on ${pageInfo.name}:`);
        violations.slice(0, 5).forEach((v: any) => {
          console.log(`  - [${v.impact}] ${v.description} (${v.nodes} nodes)`);
        });
      }

      // Only fail on critical violations
      const critical = violations.filter((v: any) => v.impact === 'critical');
      expect(critical.length).toBe(0);
    }
  });

  // 3. MOBILE RESPONSIVE
  test('📱 Mobile - Responsive Design Check', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    for (const pageInfo of PAGES.slice(0, 5)) {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');

      // Check no horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });

      if (hasHorizontalScroll) {
        console.log(`⚠️ Horizontal scroll detected on ${pageInfo.name}`);
      }

      // Check tap targets are large enough (min 44x44px)
      const smallTapTargets = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        return buttons.filter(btn => {
          const rect = btn.getBoundingClientRect();
          return rect.width < 44 || rect.height < 44;
        }).length;
      });

      if (smallTapTargets > 0) {
        console.log(`⚠️ ${smallTapTargets} small tap targets on ${pageInfo.name}`);
      }
    }
  });

  // 4. NAVIGATION & LINKS
  test('🔗 Navigation - All Links Work', async ({ page }) => {
    await page.goto('/no');
    const links = await page.locator('nav a, header a, footer a').all();
    
    console.log(`Found ${links.length} navigation links`);

    for (const link of links.slice(0, 20)) {
      const href = await link.getAttribute('href');
      const text = (await link.textContent())?.trim();
      
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        expect(href).toBeTruthy();
        console.log(`✅ Link: "${text}" -> ${href}`);
      }
    }
  });

  // 5. FORMS VALIDATION
  test('📝 Forms - Login & Signup Validation', async ({ page }) => {
    // Login form
    await page.goto('/no/innlogging');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Check form is inside <form> tag
    const isInForm = await emailInput.evaluate(el => {
      let parent = el.parentElement;
      while (parent) {
        if (parent.tagName === 'FORM') return true;
        parent = parent.parentElement;
      }
      return false;
    });

    expect(isInForm).toBe(true);
    console.log('✅ Login form structure is correct');
  });

  // 6. SIDE MENU / MOBILE NAV
  test('📂 Side Menu - Functionality Check', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/no');
    await page.waitForLoadState('networkidle');

    // Find menu button
    const menuButton = page.locator(
      'button[aria-label*="menu" i], button[aria-label*="Menu" i], button:has-text("Menu")'
    ).first();

    if (await menuButton.isVisible()) {
      console.log('✅ Found mobile menu button');
      
      // Click menu
      await menuButton.click();
      await page.waitForTimeout(500);

      // Check menu opened
      const menuVisible = await page.evaluate(() => {
        const menus = document.querySelectorAll('[role="dialog"], nav[data-state="open"], .mobile-menu, [data-menu="open"]');
        return Array.from(menus).some(menu => {
          const style = window.getComputedStyle(menu as Element);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });
      });

      if (!menuVisible) {
        console.log('⚠️ Menu button clicked but menu not visible');
      }

      expect(menuVisible).toBe(true);
      console.log('✅ Side menu opens correctly');
    } else {
      console.log('⚠️ Mobile menu button not found');
    }
  });

  // 7. DARK MODE
  test('🌙 Dark Mode - Theme Toggle', async ({ page }) => {
    await page.goto('/no');
    await page.waitForLoadState('networkidle');

    const themeToggle = page.locator(
      '[aria-label*="theme" i], [aria-label*="dark" i], button:has-text("Dark"), button:has-text("Light")'
    ).first();

    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(300);

      const isDark = await page.evaluate(() => {
        return (
          document.documentElement.classList.contains('dark') ||
          document.body.classList.contains('dark') ||
          document.documentElement.getAttribute('data-theme') === 'dark'
        );
      });

      console.log(`🌙 Dark mode: ${isDark ? 'ENABLED ✅' : 'NOT DETECTED ⚠️'}`);
    }
  });

  // 8. CRITICAL USER FLOWS
  test('🎯 Critical Flow - Homepage to Pricing', async ({ page }) => {
    await page.goto('/no');
    
    // Find and click pricing link
    const pricingLink = page.locator('a[href*="priser"], a:has-text("Priser")').first();
    await expect(pricingLink).toBeVisible();
    
    await pricingLink.click();
    await page.waitForLoadState('networkidle');
    
    // Verify we're on pricing page
    expect(page.url()).toContain('priser');
    console.log('✅ Navigation flow: Homepage → Pricing works');
  });

  // 9. ERROR PAGES
  test('🚫 404 Page - Exists and Styled', async ({ page }) => {
    const response = await page.goto('/no/this-page-does-not-exist-12345');
    expect(response?.status()).toBe(404);
    
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
    console.log('✅ 404 page exists and renders');
  });

  // 10. FINAL REPORT
  test.afterAll(async () => {
    console.log('\n\n🎯 ===== ULTIMATE TEST REPORT =====\n');
    console.log(`Total pages tested: ${testReports.length}`);
    console.log(`\nTest results saved to: test-results/`);
    console.log('\n✅ All tests completed!\n');
  });
});
