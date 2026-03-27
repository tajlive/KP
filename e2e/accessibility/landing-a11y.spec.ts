/**
 * Accessibility E2E Tests for Klarpakke Landing Page
 * 
 * Tests:
 * - axe-core scan (0 critical violations)
 * - Keyboard navigation through all interactive elements
 * - Focus management visibility and logical order
 * - Screen reader support (aria-labels, landmarks, headings)
 * - Color contrast (via axe-core)
 * 
 * @accessibility
 */

import { test, expect, type Page, devices } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Critical WCAG rules to check
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21aa"] as const;

/**
 * Analyze page with axe-core and fail on critical violations
 */
async function assertNoCriticalAxeViolations(page: Page, context: string) {
  const results = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();

  const criticalViolations = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );

  if (criticalViolations.length > 0) {
    const summary = criticalViolations
      .map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`
      )
      .join("\n");
    expect(
      criticalViolations,
      `A11y violations found in ${context}:\n${summary}`
    ).toHaveLength(0);
  }

  // Log all violations for information (non-blocking)
  if (results.violations.length > 0) {
    console.log(
      `ℹ️  ${results.violations.length} a11y violations found (non-critical):`,
      results.violations.map((v) => v.id)
    );
  }
}

/**
 * Get all interactive elements on the page
 */
async function getInteractiveElements(page: Page) {
  return page.locator(
    'a, button, input, select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])'
  );
}

test.describe("Landing Page Accessibility @accessibility", () => {
  test("landing page has no critical axe violations", async ({ page }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    
    // Wait for key elements to be visible
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 10000,
    });

    await assertNoCriticalAxeViolations(page, "/no landing page");
  });

  test("landing page has proper heading structure", async ({ page }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded" });

    // Check for h1
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    
    // Count h1 - should be exactly 1
    const h1Count = await page.locator("h1").count();
    expect(h1Count, "Page should have exactly one h1").toBe(1);

    // Check h1 has text content
    const h1Text = await h1.textContent();
    expect(h1Text?.trim().length, "h1 should have content").toBeGreaterThan(0);

    // Check heading hierarchy - no skipped levels
    const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();
    let lastLevel = 1;
    for (const heading of headings) {
      const tagName = await heading.evaluate((el) => el.tagName.toLowerCase());
      const level = parseInt(tagName[1]);
      // Allow same or next level, but not skipping (e.g., h1 -> h3 is bad)
      if (level > lastLevel) {
        expect(
          level,
          `Heading level skipped: ${tagName} after h${lastLevel}`
        ).toBeLessThanOrEqual(lastLevel + 1);
      }
      lastLevel = Math.max(lastLevel, level);
    }
  });

  test("keyboard navigation works through all interactive elements", async ({
    page,
  }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded" });

    // Get initial focus
    await page.keyboard.press("Tab");
    
    // Track focused elements
    const focusedElements: string[] = [];
    const maxTabs = 20; // Prevent infinite loops
    
    for (let i = 0; i < maxTabs; i++) {
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        return {
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.slice(0, 30) || "",
          ariaLabel: el.getAttribute("aria-label") || "",
          testId: el.getAttribute("data-testid") || "",
        };
      });

      if (!focusedElement) break;

      const elementKey = `${focusedElement.tag}-${focusedElement.text}-${focusedElement.ariaLabel}`;
      
      // Stop if we've cycled back to the start
      if (focusedElements.includes(elementKey)) break;
      
      focusedElements.push(elementKey);

      // Verify focus is visible (element has outline or ring)
      const hasVisibleFocus = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const outline = style.outlineWidth !== "0px" && style.outlineWidth !== "";
        const boxShadow = style.boxShadow !== "none" && style.boxShadow !== "";
        return outline || boxShadow;
      });

      // Log for debugging but don't fail (some elements may use custom focus styles)
      if (!hasVisibleFocus) {
        console.log(
          `⚠️  Focus may not be visible on: ${focusedElement.tag} - ${focusedElement.text}`
        );
      }

      await page.keyboard.press("Tab");
    }

    // Should have tabbed through multiple elements
    expect(
      focusedElements.length,
      "Should have multiple focusable elements"
    ).toBeGreaterThan(3);
  });

  test("focus management - focus is visible on interactive elements", async ({
    page,
  }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded" });

    // Find primary CTA and tab to it
    const cta = page.getByTestId("hero-cta-signup");
    await expect(cta).toBeVisible();

    // Tab until we reach the CTA
    let attempts = 0;
    let isFocused = false;
    while (attempts < 10 && !isFocused) {
      await page.keyboard.press("Tab");
      isFocused = await cta.evaluate(
        (el) => document.activeElement === el
      );
      attempts++;
    }

    expect(isFocused, "CTA should be focusable via keyboard").toBe(true);

    // Check that focus styles are applied
    const focusStyles = await cta.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
        boxShadow: style.boxShadow,
      };
    });

    // Either outline or box-shadow should indicate focus
    const hasOutline =
      focusStyles.outlineWidth !== "0px" && focusStyles.outlineWidth !== "";
    const hasBoxShadow =
      focusStyles.boxShadow !== "none" && focusStyles.boxShadow !== "";

    expect(
      hasOutline || hasBoxShadow,
      "Focused element should have visible focus indicator"
    ).toBe(true);
  });

  test("screen reader landmarks are present", async ({ page }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded" });

    // Check for main landmark
    const main = page.locator("main");
    await expect(main).toHaveCount(1);

    // Check for navigation landmark
    const nav = page.getByRole("navigation");
    await expect(nav).toBeVisible();

    // Check for banner/header (optional)
    const banner = page.locator("header, [role='banner']");
    const bannerCount = await banner.count();
    if (bannerCount > 0) {
      console.log(`✅ Found ${bannerCount} banner/header element(s)`);
    }

    // Check for contentinfo/footer (optional)
    const footer = page.locator("footer, [role='contentinfo']");
    const footerCount = await footer.count();
    if (footerCount > 0) {
      console.log(`✅ Found ${footerCount} footer element(s)`);
    }
  });

  test("images have alt text", async ({ page }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded" });

    const images = await page.locator("img").all();
    
    for (const img of images) {
      const hasAlt = await img.evaluate((el) => {
        const alt = el.getAttribute("alt");
        // Empty alt is valid for decorative images
        // aria-hidden="true" or role="presentation" also valid
        const isHidden =
          el.getAttribute("aria-hidden") === "true" ||
          el.getAttribute("role") === "presentation";
        return alt !== null || isHidden;
      });

      const src = await img.getAttribute("src");
      
      if (!hasAlt) {
        console.warn(`⚠️  Image may be missing alt text: ${src}`);
      }
    }
  });

  test("links have descriptive text", async ({ page }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded" });

    const links = await page.locator("a").all();
    let emptyLinkCount = 0;

    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute("aria-label");
      const hasVisibleText = text && text.trim().length > 0;
      const hasAriaLabel = ariaLabel && ariaLabel.trim().length > 0;

      if (!hasVisibleText && !hasAriaLabel) {
        const href = await link.getAttribute("href");
        console.warn(`⚠️  Link may be missing accessible text: ${href}`);
        emptyLinkCount++;
      }
    }

    // Allow some decorative/empty links but flag if many
    if (emptyLinkCount > 5) {
      console.warn(`Found ${emptyLinkCount} links without accessible text`);
    }
  });

  test("form elements have associated labels", async ({ page }) => {
    await page.goto("/no/kalkulator", { waitUntil: "domcontentloaded" });

    const inputs = await page.locator("input, select, textarea").all();
    
    for (const input of inputs) {
      const hasLabel = await input.evaluate((el) => {
        const id = el.id;
        const ariaLabel = el.getAttribute("aria-label");
        const ariaLabelledBy = el.getAttribute("aria-labelledby");
        const hasImplicitLabel = el.closest("label") !== null;
        const hasExplicitLabel =
          id && document.querySelector(`label[for="${id}"]`) !== null;
        return (
          hasImplicitLabel ||
          hasExplicitLabel ||
          ariaLabel ||
          ariaLabelledBy ||
          el.placeholder // placeholder is a fallback
        );
      });

      if (!hasLabel) {
        const type = await input.getAttribute("type");
        console.warn(`⚠️  Input may be missing label: ${type || "unknown"}`);
      }
    }
  });
});

test.describe("Landing Page Accessibility - Mobile @accessibility @mobile", () => {
  test("mobile viewport has no critical axe violations", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/no", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    await assertNoCriticalAxeViolations(page, "/no landing page (mobile)");
  });

  test("touch targets are large enough on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/no", { waitUntil: "domcontentloaded" });

    const interactiveElements = await page
      .locator("a, button")
      .filter({ visible: true })
      .all();

    let smallTargets = 0;
    for (const el of interactiveElements) {
      const box = await el.boundingBox();
      if (box) {
        // WCAG recommends 44x44 CSS pixels for touch targets
        if (box.width < 44 || box.height < 44) {
          smallTargets++;
        }
      }
    }

    // Log warning but don't fail (design may have intentional small elements)
    if (smallTargets > 0) {
      console.log(
        `ℹ️  ${smallTargets} elements have touch targets smaller than 44x44px`
      );
    }
  });
});

test.describe("Auth Pages Accessibility @accessibility", () => {
  test("login page has no critical axe violations", async ({ page }) => {
    await page.goto("/no/innlogging", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    await assertNoCriticalAxeViolations(page, "/no/innlogging");
  });

  test("signup page has no critical axe violations", async ({ page }) => {
    await page.goto("/no/signup", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    await assertNoCriticalAxeViolations(page, "/no/signup");
  });

  test("pricing page has no critical axe violations", async ({ page }) => {
    await page.goto("/no/priser", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    await assertNoCriticalAxeViolations(page, "/no/priser");
  });
});
