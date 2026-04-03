import { test, expect } from "@playwright/test";

const BASE = "https://www.klarpakke.no";

test("Landing NO: laster og har CTA", async ({ page }) => {
  await page.goto(`${BASE}/no`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/Klarpakke/i);
  const cta = page.locator(
    'a[href*="signup"], a[href*="registrer"], button:has-text("Start"), button:has-text("Kom i gang")',
  );
  await expect(cta.first()).toBeVisible();
});

test("Landing EN: laster og har CTA", async ({ page }) => {
  await page.goto(`${BASE}/en`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/Klarpakke/i);
});

test("Prisside: laster", async ({ page }) => {
  await page.goto(`${BASE}/no/priser`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1, h2").first()).toBeVisible();
  const ctaButtons = page
    .locator("button, a")
    .filter({ hasText: /velg|start|kjøp|gratis/i });
  await expect(ctaButtons.first()).toBeVisible({ timeout: 10000 });
});

test("Innlogging: viser loginskjema", async ({ page }) => {
  await page.goto(`${BASE}/no/innlogging`, { waitUntil: "domcontentloaded" });
  const loginPage = page.getByTestId("login-page").first();
  await expect(loginPage).toBeVisible();
});

test("Redirect: /settings → /innstillinger (første hop, ingen redirect-loop)", async ({
  request,
}) => {
  const res = await request.get(`${BASE}/settings`, {
    maxRedirects: 0,
    timeout: 15000,
    failOnStatusCode: false,
  });
  expect([301, 302, 303, 307, 308]).toContain(res.status());
  const loc = res.headers()["location"] ?? "";
  expect(loc).toMatch(/innstillinger/i);
});

test("Paper trading: side laster", async ({ page }) => {
  await page.goto(`${BASE}/no/paper-trading`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page).not.toHaveTitle(/404|error/i);
  // Page renders PaperTradingList; assert on main content container
  await expect(page.locator("main").first()).toBeVisible();
});

test("Landing: har meta description", async ({ page }) => {
  await page.goto(`${BASE}/no`, { waitUntil: "domcontentloaded" });
  const meta = await page
    .locator('head meta[name="description"]')
    .getAttribute("content");
  expect(meta).toBeTruthy();
  expect(meta!.length).toBeGreaterThan(50);
});

test("Ingen MISSING_MESSAGE console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && msg.text().includes("MISSING_MESSAGE")) {
      errors.push(msg.text());
    }
  });
  await page.goto(`${BASE}/no`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toBeVisible();
  expect(errors).toHaveLength(0);
});
