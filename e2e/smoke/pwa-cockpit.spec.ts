import { expect, test } from "@playwright/test";

/**
 * @smoke PWA Cockpit
 *
 * Verifies PWA assets are publicly reachable and correctly configured.
 * Service worker registration inside /no/handel is authenticated and verified
 * by the unit/integration setup; this smoke test checks the static PWA plumbing.
 */

const COCKPIT_URL = "/no/handel";
const PUBLIC_URL = "/no";

test.describe("PWA Cockpit", () => {
  test("manifest.json is reachable and valid", async ({ page }) => {
    const response = await page.goto("/manifest.json");
    expect(response?.status()).toBe(200);
    expect(response?.headers()["content-type"]).toContain("application/json");

    const manifest = await page.evaluate(() =>
      JSON.parse(document.body.innerText),
    );
    expect(manifest.start_url).toBeDefined();
    expect(manifest.display).toBe("standalone");
    expect(manifest.scope).toBeDefined();
  });

  test("sw.js is reachable as javascript", async ({ page }) => {
    const response = await page.goto("/sw.js");
    expect(response?.status()).toBe(200);
    expect(response?.headers()["content-type"]).toContain("javascript");
  });

  test("manifest link is present on public pages", async ({ page }) => {
    await page.goto(PUBLIC_URL, { waitUntil: "domcontentloaded" });
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", "/manifest.json");
  });

  test("offline.html is reachable", async ({ page }) => {
    const response = await page.goto("/offline.html");
    expect(response?.status()).toBe(200);
  });

  test("cockpit page includes manifest link", async ({ page }) => {
    await page.goto(COCKPIT_URL, { waitUntil: "domcontentloaded" });
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", "/manifest.json");
  });
});
