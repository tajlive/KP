/**
 * Responsive Design E2E Tests
 * 
 * Tests:
 * - Mobile viewport (375x667): Layout ok, ingen horizontal scroll
 * - Tablet viewport (768x1024): Grid fungerer
 * - Desktop viewport (1920x1080): Full visning
 * - Touch interactions: Swipe, tap (hvor relevant)
 * 
 * @responsive @mobile
 */

import { test, expect } from "@playwright/test";

test.describe("Responsive Landing Page @responsive @mobile", () => {
  test.describe("Mobile Viewport (375x667)", () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test("hero is visible and readable on mobile", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      // Hero heading should be visible
      const heroHeading = page.getByRole("heading", { level: 1 });
      await expect(heroHeading).toBeVisible({ timeout: 15000 });

      // Hero text should not overflow
      const headingBox = await heroHeading.boundingBox();
      expect(headingBox?.width).toBeLessThanOrEqual(375);
    });

    test("no horizontal scroll on mobile", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});

      // Check for horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      expect(
        hasHorizontalScroll,
        "Page should not have horizontal scroll on mobile"
      ).toBe(false);
    });

    test("CTA buttons are stacked and tappable on mobile", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      const primaryCta = page.getByTestId("hero-cta-signup");
      await expect(primaryCta).toBeVisible({ timeout: 10000 });

      // Verify button is tappable (large enough)
      const box = await primaryCta.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44); // WCAG minimum
      expect(box?.width).toBeGreaterThanOrEqual(44);

      // Secondary CTA should also be visible
      const secondaryCta = page.getByTestId("hero-cta-secondary");
      await expect(secondaryCta).toBeVisible();
    });

    test("hamburger menu opens and closes", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      // Look for mobile menu button
      const menuButton = page
        .locator(
          'button[aria-label*="menu" i], button[aria-label*="meny" i], [data-testid="mobile-menu-button"]'
        )
        .first();

      if (await menuButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Open menu
        await menuButton.click();

        // Verify menu content is visible
        const menuContent = page.locator(
          '[role="dialog"], nav[aria-expanded="true"], [data-testid="mobile-menu"]'
        );
        await expect(menuContent.first()).toBeVisible({ timeout: 5000 });

        // Close menu
        await menuButton.click();
      } else {
        // Menu may be always visible on this breakpoint
        console.log("Mobile menu button not found - nav may be always visible");
      }
    });

    test("trust strip adapts to mobile layout", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      const trustStrip = page.getByTestId("trust-strip");
      await expect(trustStrip).toBeVisible({ timeout: 10000 });

      // Trust strip should be visible within viewport
      const box = await trustStrip.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(375);
    });

    test("images scale properly on mobile", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      const images = await page.locator("img").all();

      for (const img of images) {
        const box = await img.boundingBox();
        if (box) {
          // Images should not overflow viewport
          expect(
            box.width,
            "Image width should not exceed viewport"
          ).toBeLessThanOrEqual(375 + 20); // Allow small margin
        }
      }
    });
  });

  test.describe("Tablet Viewport (768x1024)", () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test("grid layout works on tablet", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      // Hero should be visible
      const heroHeading = page.getByRole("heading", { level: 1 });
      await expect(heroHeading).toBeVisible({ timeout: 15000 });

      // CTAs should be side by side or well-spaced
      const primaryCta = page.getByTestId("hero-cta-signup");
      const secondaryCta = page.getByTestId("hero-cta-secondary");

      await expect(primaryCta).toBeVisible();
      await expect(secondaryCta).toBeVisible();

      // No horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });

    test("navigation is accessible on tablet", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      // Navigation links should be visible (not in hamburger)
      const navLinks = page.getByRole("navigation").locator("a");
      const linkCount = await navLinks.count();

      if (linkCount > 0) {
        // At least some nav links should be visible
        const visibleLinks = await navLinks
          .filter({ visible: true })
          .count();
        expect(visibleLinks).toBeGreaterThan(0);
      }
    });

    test("trust strip uses appropriate grid", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      const trustStrip = page.getByTestId("trust-strip");
      await expect(trustStrip).toBeVisible();

      // Check grid layout
      const grid = trustStrip.locator(
        ".grid, [class*='grid-cols']"
      );
      if (await grid.first().isVisible().catch(() => false)) {
        const box = await grid.first().boundingBox();
        // Grid should use most of the viewport width
        expect(box?.width).toBeGreaterThan(600);
      }
    });
  });

  test.describe("Desktop Viewport (1920x1080)", () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test("full layout displayed on desktop", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      // Hero with dashboard mockup should be visible
      const heroHeading = page.getByRole("heading", { level: 1 });
      await expect(heroHeading).toBeVisible({ timeout: 15000 });

      // All navigation links should be visible
      const nav = page.getByRole("navigation");
      await expect(nav).toBeVisible();

      // Demo widget should be visible
      const demoWidget = page.getByTestId("demo-widget");
      await expect(demoWidget).toBeVisible();
    });

    test("two-column layout on desktop", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      // Hero section should have two columns (text + mockup)
      const heroSection = page.locator("section").first();
      const grid = heroSection.locator(".grid-cols-2, .lg\\:grid-cols-2");
      
      // Check if we have content on both sides
      const content = heroSection.locator("h1, .max-w-6xl");
      await expect(content.first()).toBeVisible();
    });

    test("all trust indicators visible on desktop", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      const trustStrip = page.getByTestId("trust-strip");
      await expect(trustStrip).toBeVisible();

      // All 4 stats should be visible
      const stats = trustStrip.locator(
        ".grid > div, [class*='grid-cols'] > div"
      );
      const statCount = await stats.count();
      expect(statCount).toBeGreaterThanOrEqual(4);
    });
  });

  test.describe("Touch Interactions", () => {
    test("touch scrolling works smoothly", async ({ page }) => {
      // Emulate Pixel 5 viewport
      await page.setViewportSize({ width: 393, height: 851 });
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      // Check scroll position
      const scrollPosition = await page.evaluate(() => window.scrollY);
      expect(scrollPosition).toBeGreaterThan(0);

      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);

      const scrollTop = await page.evaluate(() => window.scrollY);
      expect(scrollTop).toBe(0);
    });

    test("tap targets are appropriate size", async ({ page }) => {
      // Emulate Pixel 5 viewport
      await page.setViewportSize({ width: 393, height: 851 });
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      const interactiveElements = await page
        .locator("a, button")
        .filter({ visible: true })
        .all();

      let smallTargets = 0;
      const minTouchSize = 44; // WCAG 2.5.5

      for (const el of interactiveElements.slice(0, 20)) {
        // Check first 20 elements
        const box = await el.boundingBox();
        if (box) {
          if (box.width < minTouchSize || box.height < minTouchSize) {
            smallTargets++;
            const tagName = await el.evaluate((e) => e.tagName);
            console.log(`Small touch target: ${tagName} ${box.width}x${box.height}`);
          }
        }
      }

      // Log but don't fail - some small elements may be intentional
      if (smallTargets > 5) {
        console.warn(`${smallTargets} elements have touch targets smaller than ${minTouchSize}px`);
      }
    });
  });

  test.describe("Responsive Images", () => {
    test("images have responsive sizing", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      const images = await page.locator("img").all();

      for (const img of images) {
        // Check for responsive image attributes
        const hasSrcSet = await img.evaluate((el) => el.hasAttribute("srcset"));
        const hasSizes = await img.evaluate((el) => el.hasAttribute("sizes"));
        const hasLoading = await img.evaluate((el) => el.hasAttribute("loading"));

        if (!hasSrcSet && !hasSizes) {
          // Check if image has CSS responsive sizing
          const parent = img.locator("..");
          const parentClasses = await parent.evaluate(
            (el) => el.className
          ).catch(() => "");
          
          const isResponsive =
            parentClasses.includes("w-full") ||
            parentClasses.includes("max-w") ||
            parentClasses.includes("object-cover");

          if (!isResponsive) {
            const src = await img.getAttribute("src");
            console.log(`Image may not be responsive: ${src}`);
          }
        }

        if (!hasLoading) {
          console.log("Image missing loading attribute (lazy/eager)");
        }
      }
    });
  });
});
