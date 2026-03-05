/**
 * E2E Tests: Canonical URL Redirects
 * Verifies that all duplicate URLs correctly redirect to Norwegian canonical URLs
 * 
 * SEO Strategy: Norwegian wins (norsk er kanonikal)
 * - /login → /innlogging
 * - /courses → /kurs
 * - /pricing → /priser
 * etc.
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

test.describe("Canonical URL Redirects (SEO)", () => {
  test.describe("English routes → Norwegian canonical", () => {
    const redirects = [
      { from: "/en/login", to: "/innlogging" },
      { from: "/en/signup", to: "/registrering" },
      { from: "/en/pricing", to: "/priser" },
      { from: "/en/courses", to: "/kurs" },
      { from: "/en/about", to: "/om-oss" },
      { from: "/en/contact", to: "/kontakt" },
      { from: "/en/privacy", to: "/personvern" },
      { from: "/en/terms", to: "/vilkar" },
      { from: "/en/blog", to: "/blogg" },
      { from: "/en/marketplace", to: "/markedsplass" },
      { from: "/en/settings", to: "/innstillinger" },
      { from: "/en/portfolio", to: "/portefolje" },
      { from: "/en/withdrawals", to: "/uttak" },
      { from: "/en/deposits", to: "/innskudd" },
    ];

    for (const { from, to } of redirects) {
      test(`301 redirect: ${from} → ${to}`, async ({ page }) => {
        const response = await page.goto(`${BASE_URL}${from}`, { 
          waitUntil: "networkidle",
        });
        
        // Should be 308 (permanent redirect) or 307 (temporary during dev)
        expect([301, 308, 307]).toContain(response?.status());
        
        // Final URL should be the Norwegian canonical
        expect(page.url()).toBe(`${BASE_URL}${to}`);
      });
    }
  });

  test.describe("Root English routes → Norwegian", () => {
    const redirects = [
      { from: "/login", to: "/innlogging" },
      { from: "/signup", to: "/registrering" },
      { from: "/pricing", to: "/priser" },
      { from: "/courses", to: "/kurs" },
      { from: "/about", to: "/om-oss" },
      { from: "/contact", to: "/kontakt" },
      { from: "/privacy", to: "/personvern" },
      { from: "/terms", to: "/vilkar" },
      { from: "/blog", to: "/blogg" },
      { from: "/marketplace", to: "/markedsplass" },
      { from: "/settings", to: "/innstillinger" },
      { from: "/portfolio", to: "/portefolje" },
    ];

    for (const { from, to } of redirects) {
      test(`301 redirect: ${from} → ${to}`, async ({ page }) => {
        const response = await page.goto(`${BASE_URL}${from}`, { 
          waitUntil: "networkidle",
        });
        
        expect([301, 308, 307]).toContain(response?.status());
        expect(page.url()).toBe(`${BASE_URL}${to}`);
      });
    }
  });

  test.describe("Course detail redirects", () => {
    test("/courses/bitcoin-basics → /kurs/bitcoin-basics", async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/courses/bitcoin-basics`, { 
        waitUntil: "networkidle",
      });
      
      expect([301, 308, 307]).toContain(response?.status());
      expect(page.url()).toBe(`${BASE_URL}/kurs/bitcoin-basics`);
    });

    test("/course/bitcoin-basics → /kurs/bitcoin-basics", async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/course/bitcoin-basics`, { 
        waitUntil: "networkidle",
      });
      
      expect([301, 308, 307]).toContain(response?.status());
      expect(page.url()).toBe(`${BASE_URL}/kurs/bitcoin-basics`);
    });
  });

  test.describe("Legacy auto-trade redirects", () => {
    test("/auto-trade → /auto-trading-ai", async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/auto-trade`, { 
        waitUntil: "networkidle",
      });
      
      expect([301, 308, 307]).toContain(response?.status());
      // Should eventually redirect to dashboard
      expect(page.url()).toContain("/dashboard");
    });

    test("/auto-trading → redirects to dashboard", async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/auto-trading`, { 
        waitUntil: "networkidle",
      });
      
      expect([301, 308, 307]).toContain(response?.status());
      expect(page.url()).toContain("/dashboard");
    });
  });
});
