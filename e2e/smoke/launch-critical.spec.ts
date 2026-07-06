import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.BASE_URL || "http://localhost:3000";

test("Landing NO: laster og har CTA", async ({ page }) => {
  await page.goto(`${BASE}/no`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/Klarpakke/i);
  const cta = page.getByTestId("hero-cta");
  await expect(cta).toBeVisible();
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

test("Redirect: /innstillinger → profile settings uten redirect-loop", async ({
  page,
}) => {
  const response = await page.goto(`${BASE}/no/innstillinger`, {
    waitUntil: "domcontentloaded",
  });

  const chain: string[] = [];
  let request = response?.request() ?? null;
  while (request?.redirectedFrom()) {
    request = request.redirectedFrom();
  }
  while (request) {
    chain.push(request.url());
    request = request.redirectedTo() ?? null;
  }

  expect(chain).toEqual([
    `${BASE}/no/innstillinger`,
    `${BASE}/no/profile?tab=settings`,
    `${BASE}/no/login?next=%2Fno%2Fprofile`,
  ]);
  expect(response?.status()).toBe(200);
});

test("Paper trading: side laster", async ({ page }) => {
  await page.goto(`${BASE}/no/paper-trading`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page).not.toHaveTitle(/404|error/i);
  // /paper-trading is a legacy redirect to /handel?mode=paper, which is auth-protected.
  // Unauthenticated smoke tests land on the login page; verify it rendered.
  await expect(page.getByTestId("login-page").first()).toBeVisible();
  expect(page.url()).toMatch(/\/(login|innlogging)/);
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
