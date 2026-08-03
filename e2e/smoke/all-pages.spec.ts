/**
 * E2E: Alle sider — verifiser at ingen sider krasjer
 * 
 * Fanger feil som "Pilot ikke tilgjengelig" og "alt er borte".
 * Kjører mot PROD (klarpakke.no) — ingen localhost.
 * 
 * Kjør: npx playwright test e2e/smoke/all-pages.spec.ts
 */

import { test, expect } from "@playwright/test";

// Alle sider som må fungere
const PAGES = [
  // Markedsføring (offentlig)
  { path: "/", name: "Landing", public: true },
  { path: "/priser", name: "Priser", public: true },
  { path: "/kurs", name: "Kurs", public: true },
  { path: "/om-oss", name: "Om oss", public: true },
  { path: "/login", name: "Login", public: true },
  { path: "/register", name: "Registrer", public: true },

  // Trading (krever auth — redirect til login er OK)
  { path: "/trade", name: "Trade", public: false },
  { path: "/trade?tab=manual", name: "Trade — Manuell", public: false },
  { path: "/trade?tab=auto", name: "Trade — Auto", public: false },
  { path: "/trade?tab=pilot", name: "Trade — Pilot", public: false },
  { path: "/trade?tab=stats", name: "Trade — Statistikk", public: false },
  { path: "/trade?tab=backtest", name: "Trade — Backtest", public: false },

  // Dashboard (krever auth)
  { path: "/dashboard", name: "Dashboard", public: false },
  { path: "/dashboard/portfolio", name: "Portefølje", public: false },
  { path: "/dashboard/historikk", name: "Historikk", public: false },
  { path: "/dashboard/resultater", name: "Resultater", public: false },
  { path: "/dashboard/analysis", name: "Analyse", public: false },

  // Profil (krever auth)
  { path: "/profile", name: "Profil", public: false },

  // Backcompat-redirects (krever auth)
  { path: "/pilot", name: "Pilot (redirect)", public: false },
  { path: "/jokertrade", name: "JokerTrade (redirect)", public: false },
];

// Tekster som indikerer krasj (må være spesifikke nok til å unngå false positives)
const CRASH_INDICATORS = [
  "Application error",
  "Internal Server Error",
  "500 Internal Server Error",
  "404 Not Found",
  "This page could not be found",
  "Something went wrong",
  "client-side exception",
];

test.describe("Alle sider — ingen krasj", () => {
  for (const page of PAGES) {
    test(`${page.name} (${page.path})`, async ({ page: p }) => {
      const response = await p.goto(page.path, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });

      // Verifiser HTTP-status
      const status = response?.status() ?? 0;
      
      if (page.public) {
        // Offentlige sider: 200 OK
        expect(status).toBe(200);
      } else {
        // Auth-sider: 200 (innlogget), 307/302 (redirect til login), eller 401/403 (unauthorized)
        expect([200, 301, 302, 307, 308, 401, 403]).toContain(status);
      }

      // Vent på at siden rendrer (eller redirect til login)
      await p.waitForTimeout(2000);

      // Sjekk for krasj-indikatorer (kun hvis ikke redirect til login)
      const currentUrl = p.url();
      if (!currentUrl.includes("/login")) {
        for (const indicator of CRASH_INDICATORS) {
          const count = await p.locator(`text=${indicator}`).count();
          expect(count, `Fant krasj-indikator "${indicator}" på ${page.path}`).toBe(0);
        }
      }

      // Verifiser at siden har faktisk innhold (ikke tom)
      const bodyText = await p.locator("body").textContent();
      expect(bodyText?.length ?? 0, `${page.path} er tom`).toBeGreaterThan(100);

      // Verifiser at det ikke er JS-feil i console
      const errors: string[] = [];
      p.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push(msg.text());
        }
      });

      // Re-sjekk etter console-lytting
      await p.waitForTimeout(1000);
      
      // Filtrer bort kjente ufarlige feil (font-loading, analytics, etc)
      const criticalErrors = errors.filter(
        (e) =>
          !e.includes("font") &&
          !e.includes("analytics") &&
          !e.includes("plausible") &&
          !e.includes("sentry") &&
          !e.includes("favicon") &&
          !e.includes("preload")
      );

      expect(
        criticalErrors.length,
        `JS-feil på ${page.path}: ${criticalErrors.join(", ")}`
      ).toBe(0);
    });
  }
});

test.describe("Kritiske funksjoner (krever auth)", () => {
  // Disse testene krever at brukeren er innlogget
  // Skip hvis vi blir redirected til login
  test.beforeEach(async ({ page }) => {
    await page.goto("/trade", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    
    // Hvis vi er på login-siden, skip testen
    if (page.url().includes("/login")) {
      test.skip(true, "Krever innlogging — redirectet til login");
    }
  });

  test("Trade-siden viser alle 5 moduser", async ({ page }) => {
    await page.goto("/trade", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Verifiser at alle moduser er synlige
    const modes = ["Manuell", "Auto", "Pilot", "Statistikk", "Backtest"];
    for (const mode of modes) {
      const locator = page.locator(`text=${mode}`);
      await expect(locator.first(), `Modus "${mode}" ikke synlig`).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("Pilot-fanen viser PilotDashboard", async ({ page }) => {
    await page.goto("/trade?tab=pilot", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Verifiser at PilotDashboard rendrer
    const pilotContent = page.locator("text=/Pilot|JOKER|Start AI/");
    await expect(pilotContent.first()).toBeVisible({ timeout: 5000 });
  });

  test("Auto-fanen viser AutoStrategyPanel", async ({ page }) => {
    await page.goto("/trade?tab=auto", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const autoContent = page.locator("text=/Auto|Strategi|Risiko/");
    await expect(autoContent.first()).toBeVisible({ timeout: 5000 });
  });
});
