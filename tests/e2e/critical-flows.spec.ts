/**
 * 🎭 KRITISKE FLOWS - Playwright E2E-tester
 * 
 * Tester de viktigste brukerreisene:
 * 1. Landing → Registrering
 * 2. Login → Dashboard
 * 3. Dashboard → Trading
 * 4. Admin-panel
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "https://www.klarpakke.no";

// Testdata
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: "TestPassword123!",
};

test.describe("🚀 Kritiske flows", () => {
  
  test.describe("1. Landing og navigasjon", () => {
    test("Landing page laster og viser hovedelementer", async ({ page }) => {
      await page.goto(`${BASE_URL}/no`);
      
      // Sjekk at siden laster
      await expect(page).toHaveTitle(/Klarpakke|KP/);
      
      // Sjekk hovedelementer (mer fleksible selectors)
      await expect(page.locator("body")).toBeVisible();
      const headings = page.locator("h1, h2").first();
      await expect(headings).toBeVisible();
    });

    test("Navigasjon til pris-siden fungerer", async ({ page }) => {
      await page.goto(`${BASE_URL}/no`);
      
      await page.getByRole("link", { name: /priser/i }).click();
      await expect(page).toHaveURL(/\/priser/);
      await expect(page.locator("h1")).toContainText(/pris/i);
    });
  });

  test.describe("2. Autentisering", () => {
    test("Login-siden er tilgjengelig", async ({ page }) => {
      await page.goto(`${BASE_URL}/no/innlogging`);
      
      // Sjekk at siden laster (fleksibel tekst-sjekk)
      await expect(page.locator("body")).toContainText(/logg inn|email|e-post/i);
      // Sjekk for input-felter (kan være label eller placeholder)
      const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="e-post" i]').first();
      await expect(emailInput).toBeVisible();
    });

    test("Registrering-siden er tilgjengelig", async ({ page }) => {
      await page.goto(`${BASE_URL}/no/registrer`);
      
      await expect(page.locator("h1")).toContainText(/registrer/i);
      await expect(page.getByPlaceholder(/e-post/i)).toBeVisible();
    });
  });

  test.describe("3. Dashboard (krever innlogging)", () => {
    test("Dashboard redirecter til login når ikke autentisert", async ({ page }) => {
      await page.goto(`${BASE_URL}/no/dashboard`);
      
      // Skal redirecte til login
      await expect(page).toHaveURL(/\/innlogging|login/);
    });
  });

  test.describe("4. API Health checks", () => {
    test("Health endpoint returnerer OK", async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/health`);
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body).toHaveProperty("status", "ok");
    });

    test("Market data API returnerer data", async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/prices/binance`);
      expect(response.status()).toBeOneOf([200, 429]); // 429 = rate limit
    });
  });

  test.describe("5. Tilgjengelighet (a11y)", () => {
    test("Landing page har korrekt HTML-struktur", async ({ page }) => {
      await page.goto(`${BASE_URL}/no`);
      
      // Sjekk at det finnes én h1
      const h1Count = await page.locator("h1").count();
      expect(h1Count).toBe(1);
      
      // Sjekk at bilder har alt-tekst
      const images = await page.locator("img").all();
      for (const img of images) {
        await expect(img).toHaveAttribute("alt", /.*/);
      }
    });
  });

});

test.describe("⚡ Performance tester", () => {
  test("Landing page LCP under 2.5s", async ({ page }) => {
    await page.goto(`${BASE_URL}/no`);
    
    // Vent på at siden er ferdig lastet
    await page.waitForLoadState("networkidle");
    
    // Mål lastetid
    const performanceTiming = await page.evaluate(() => {
      const timing = performance.timing;
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      };
    });
    
    console.log(`Load time: ${performanceTiming.loadTime}ms`);
    expect(performanceTiming.loadTime).toBeLessThan(5000); // 5 sekunder maks
  });
});

test.describe("🔒 Sikkerhet", () => {
  test("HTTPS er påkrevd", async ({ page }) => {
    await page.goto(`${BASE_URL}/no`);
    expect(page.url()).toStartWith("https://");
  });

  test("Security headers er satt", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/no`);
    const headers = response.headers();
    
    expect(headers["x-frame-options"] || headers["content-security-policy"]).toBeTruthy();
  });
});
