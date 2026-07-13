import { expect, test } from "@playwright/test";

test.describe("Service Worker", () => {
  test("sw.js is served and contains correct cache logic", async ({
    page,
  }) => {
    const resp = await page.goto("/sw.js", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });
    expect(resp?.ok()).toBe(true);
    expect(resp?.headers()["content-type"]).toContain("javascript");

    const body = await resp!.text();
    expect(body).toContain("CACHE_VERSION");
    expect(body).toContain("klarpakke-v");
    expect(body).toContain("cacheResponse");
    expect(body).toContain("Promise.allSettled");
  });

  test("SW registration does not throw on app pages", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/no/login", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const swErrors = errors.filter(
      (e) =>
        e.toLowerCase().includes("service worker") ||
        e.toLowerCase().includes("sw") ||
        e.toLowerCase().includes("cache"),
    );
    expect(swErrors).toEqual([]);
  });

  test("manifest.json is served correctly", async ({ page }) => {
    const resp = await page.goto("/manifest.json", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });
    expect(resp?.ok()).toBe(true);
  });
});
