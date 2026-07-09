/**
 * Simuler 5 testbrukere — login → dashboard → JokerTrade
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL || "https://www.klarpakke.no";
const USERS = [
  { email: "test1@klarpakke.no", password: "Test1234!" },
  { email: "test2@klarpakke.no", password: "Test1234!" },
  { email: "test3@klarpakke.no", password: "Test1234!" },
  { email: "test4@klarpakke.no", password: "Test1234!" },
  { email: "test5@klarpakke.no", password: "Test1234!" },
];

for (const user of USERS) {
  test.describe(`Bruker: ${user.email}`, () => {
    
    test("Login → Dashboard", async ({ page }) => {
      await page.goto(`${BASE}/no/login`);
      await page.locator('input[type="email"]').first().fill(user.email);
      await page.locator('input[type="password"]').first().fill(user.password);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForURL("**/dashboard**", { timeout: 15000 });
      expect(page.url()).toContain("dashboard");
    });

    test("Dashboard → JokerTrade", async ({ page }) => {
      await page.goto(`${BASE}/no/login`);
      await page.locator('input[type="email"]').first().fill(user.email);
      await page.locator('input[type="password"]').first().fill(user.password);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForURL("**/dashboard**", { timeout: 15000 });
      
      await page.goto(`${BASE}/no/jokertrade`);
      await expect(page.locator('text=JokerTrade').first()).toBeVisible({ timeout: 10000 });
    });

    test("Leaderboard → Priser", async ({ page }) => {
      await page.goto(`${BASE}/no/leaderboard`);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator('h1, h2').first()).toBeVisible();
      
      await page.goto(`${BASE}/no/priser`);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });

  });
}
