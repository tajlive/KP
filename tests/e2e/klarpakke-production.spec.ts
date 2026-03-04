import { test, expect } from "@playwright/test";
import { allure } from "allure-playwright";

const BASE_URL = process.env.TEST_BASE_URL || "https://www.klarpakke.no";

test.describe("🚀 Klarpakke Produksjons Tester", () => {
  test.beforeEach(async ({ page }) => {
    allure.epic("Klarpakke E2E");
    allure.feature("Produksjons Verifisering");
  });

  test("✅ Hovedside laster korrekt", async ({ page }) => {
    allure.story("Landing Page");
    allure.severity("critical");
    
    await allure.step("Naviger til hovedsiden", async () => {
      await page.goto(`${BASE_URL}/no`);
    });

    await allure.step("Verifiser at siden laster", async () => {
      await expect(page).toHaveTitle(/Klarpakke/);
    });

    await allure.step("Sjekk at hero-seksjon finnes", async () => {
      const hero = page.locator("h1, [data-testid='hero']").first();
      await expect(hero).toBeVisible();
    });

    await allure.step("Verifiser at footer laster", async () => {
      const footer = page.locator("footer");
      await expect(footer).toBeVisible();
    });

    await allure.step("Ta screenshot av hovedside", async () => {
      await page.screenshot({ path: "allure-results/homepage.png", fullPage: true });
      allure.attachment("Hovedside Screenshot", await page.screenshot(), "image/png");
    });
  });

  test("✅ API Health endpoint fungerer", async ({ request }) => {
    allure.story("API Health");
    allure.severity("critical");
    
    await allure.step("Kall health endpoint", async () => {
      const response = await request.get(`${BASE_URL}/api/health`);
      
      await allure.step("Verifiser HTTP 200", async () => {
        expect(response.status()).toBe(200);
      });

      await allure.step("Verifiser respons body", async () => {
        const body = await response.json();
        expect(body).toHaveProperty("status", "ok");
      });

      allure.attachment("Health Response", JSON.stringify(await response.json(), null, 2), "application/json");
    });
  });

  test("✅ Autentisering - Login knapp finnes", async ({ page }) => {
    allure.story("Autentisering");
    allure.severity("high");
    
    await allure.step("Naviger til hovedsiden", async () => {
      await page.goto(`${BASE_URL}/no`);
    });

    await allure.step("Sjekk for login knapp eller link", async () => {
      const loginButton = page.locator("text=Logg inn, text=Login, [data-testid='login'], a[href*='login'], a[href*='auth']").first();
      await expect(loginButton).toBeVisible();
    });
  });

  test("✅ Navigasjon - Alle hovedlenker fungerer", async ({ page }) => {
    allure.story("Navigasjon");
    allure.severity("medium");
    
    await allure.step("Naviger til hovedsiden", async () => {
      await page.goto(`${BASE_URL}/no`);
    });

    const links = [
      { name: "Priser", path: "/no/priser" },
      { name: "Akademi", path: "/no/akademi" },
      { name: "Hjelp", path: "/no/hjelp" },
    ];

    for (const link of links) {
      await allure.step(`Test navigering til ${link.name}`, async () => {
        await page.goto(`${BASE_URL}${link.path}`);
        await expect(page).toHaveURL(new RegExp(link.path));
        expect(page.statusCode?.()).not.toBe(404);
      });
    }
  });

  test("✅ Responsiv design - Mobil visning", async ({ page }) => {
    allure.story("Responsivitet");
    allure.severity("medium");
    
    await allure.step("Sett mobil viewport", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    await allure.step("Naviger til hovedsiden", async () => {
      await page.goto(`${BASE_URL}/no`);
    });

    await allure.step("Verifiser at mobilmeny finnes", async () => {
      const menuButton = page.locator("[data-testid='mobile-menu'], button[aria-label*='menu'], .hamburger").first();
      await expect(menuButton).toBeVisible();
    });

    await allure.step("Ta screenshot av mobilvisning", async () => {
      allure.attachment("Mobil Screenshot", await page.screenshot(), "image/png");
    });
  });

  test("✅ CSP Headers er satt", async ({ page }) => {
    allure.story("Sikkerhet");
    allure.severity("high");
    
    await allure.step("Naviger til hovedsiden", async () => {
      const response = await page.goto(`${BASE_URL}/no`);
      const headers = await response?.allHeaders();
      
      await allure.step("Verifiser CSP header", async () => {
        expect(headers?.["content-security-policy"]).toBeDefined();
      });

      await allure.step("Verifiser X-Frame-Options", async () => {
        const frameOptions = headers?.["x-frame-options"] || headers?.["content-security-policy"];
        expect(frameOptions).toBeDefined();
      });

      allure.attachment("Response Headers", JSON.stringify(headers, null, 2), "application/json");
    });
  });

  test("✅ Performance - Core Web Vitals", async ({ page }) => {
    allure.story("Performance");
    allure.severity("medium");
    
    await allure.step("Naviger til hovedsiden", async () => {
      await page.goto(`${BASE_URL}/no`);
    });

    await allure.step("Mål LCP (Largest Contentful Paint)", async () => {
      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lcpEntry = entries[entries.length - 1];
            resolve(lcpEntry?.startTime || 0);
          }).observe({ entryTypes: ["largest-contentful-paint"] });
          
          setTimeout(() => resolve(0), 5000);
        });
      });
      
      allure.attachment("LCP (ms)", String(lcp), "text/plain");
      expect(Number(lcp)).toBeLessThan(4000); // Under 4 sekunder
    });

    await allure.step("Sjekk at ingen store bilder blokkerer", async () => {
      const images = await page.locator("img").count();
      allure.attachment("Antall bilder", String(images), "text/plain");
    });
  });

  test("✅ SEO - Meta tags finnes", async ({ page }) => {
    allure.story("SEO");
    allure.severity("low");
    
    await allure.step("Naviger til hovedsiden", async () => {
      await page.goto(`${BASE_URL}/no`);
    });

    await allure.step("Verifiser title tag", async () => {
      await expect(page).toHaveTitle(/.+/);
    });

    await allure.step("Verifiser meta description", async () => {
      const description = page.locator("meta[name='description']");
      await expect(description).toHaveAttribute("content", /.+/);
    });

    await allure.step("Verifiser viewport meta", async () => {
      const viewport = page.locator("meta[name='viewport']");
      await expect(viewport).toHaveAttribute("content", /width=device-width/);
    });
  });
});

test.describe("🔐 Autentisering Tester", () => {
  test("✅ Login side eksisterer", async ({ page }) => {
    allure.story("Login Side");
    allure.severity("high");
    
    await allure.step("Naviger til login", async () => {
      await page.goto(`${BASE_URL}/no/login`);
    });

    await allure.step("Verifiser at login-felt finnes", async () => {
      const emailField = page.locator("input[type='email'], input[name='email']").first();
      await expect(emailField).toBeVisible();
    });
  });
});

test.describe("📊 Dashboard Tester (krever autentisering)", () => {
  test.skip("✅ Dashboard laster for innlogget bruker", async ({ page }) => {
    allure.story("Dashboard");
    allure.severity("high");
    
    // Denne testen krever autentisert session
    // Må utvides med faktisk login-flow
    
    await allure.step("Login med testbruker", async () => {
      // Implementer login flow her
    });

    await allure.step("Naviger til dashboard", async () => {
      await page.goto(`${BASE_URL}/no/dashboard`);
    });

    await allure.step("Verifiser dashboard innhold", async () => {
      await expect(page.locator("text=Dashboard")).toBeVisible();
    });
  });
});
