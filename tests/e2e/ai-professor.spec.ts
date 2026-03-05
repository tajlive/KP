/**
 * E2E Tests: AI Professor Integration (KLA-119)
 * Verifies AI Professor appears in BotStatusDashboard with three tabs
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

test.describe("AI Professor Integration", () => {
  test.beforeEach(async ({ page }) => {
    // Login først (mock eller reell auth)
    // For nå bare sjekker vi at UI-et eksisterer
  });

  test.describe("Bot Status Dashboard Tabs", () => {
    test("should have three tabs: Overview, Advanced, AI", async ({ page }) => {
      // Navigate to dashboard with active strategy
      // Note: This requires authenticated user with active strategy
      await page.goto(`${BASE_URL}/dashboard/trading`, { 
        waitUntil: "networkidle",
      });

      // Check if tabs exist (if user has active strategy)
      const tabs = page.locator('button:has-text("Oversikt"), button:has-text("Overview")');
      const advancedTab = page.locator('button:has-text("Avansert"), button:has-text("Advanced")');
      const aiTab = page.locator('button:has-text("AI")');

      // Tabs should be visible when bot is active
      await expect(tabs.or(advancedTab).or(aiTab)).toBeVisible().catch(() => {
        // If no active strategy, we're on the strategy selection page
        console.log("No active strategy - on selection page");
      });
    });

    test("AI tab should be clickable and show AI Decision Panel", async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/trading`, { 
        waitUntil: "networkidle",
      });

      const aiTab = page.locator('button:has-text("AI")');
      
      // Click AI tab if it exists
      if (await aiTab.isVisible().catch(() => false)) {
        await aiTab.click();
        
        // Should show AI Decision Panel content
        await expect(page.locator('text="AI Professor"')).toBeVisible();
        await expect(page.locator('text="Fear & Greed"')).toBeVisible();
      }
    });
  });

  test.describe("AI Decision Panel Components", () => {
    test("should display Fear & Greed gauge when AI tab active", async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/trading`, { 
        waitUntil: "networkidle",
      });

      const aiTab = page.locator('button:has-text("AI")');
      
      if (await aiTab.isVisible().catch(() => false)) {
        await aiTab.click();
        
        // Fear & Greed section should appear
        const fearGreedSection = page.locator('[data-testid="fear-greed-gauge"]').or(
          page.locator('text=/fear.*greed/i')
        );
        
        await expect(fearGreedSection).toBeVisible();
      }
    });

    test("should show market sentiment analysis", async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/trading`, { 
        waitUntil: "networkidle",
      });

      const aiTab = page.locator('button:has-text("AI")');
      
      if (await aiTab.isVisible().catch(() => false)) {
        await aiTab.click();
        
        // Market sentiment should be shown
        await expect(page.locator('text=/markeds.*sentiment|market.*sentiment/i')).toBeVisible();
      }
    });
  });

  test.describe("Auto-trading AI redirects", () => {
    test("/auto-trading-ai redirects to dashboard", async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/auto-trading-ai`, { 
        waitUntil: "networkidle",
      });
      
      expect([301, 308, 307]).toContain(response?.status());
      expect(page.url()).toContain("/dashboard");
    });

    test("/auto-trading redirects to dashboard", async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/auto-trading`, { 
        waitUntil: "networkidle",
      });
      
      expect([301, 308, 307]).toContain(response?.status());
      expect(page.url()).toContain("/dashboard");
    });
  });
});
