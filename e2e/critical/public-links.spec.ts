import { test, expect } from "@playwright/test";

/**
 * Critical: public links must return 200.
 * Coverts hero CTA targets that previously gave 404.
 */
test.describe("Public links @critical", () => {
  test("hero CTA-er er ikke døde", async ({ page }) => {
    // Ling start-side slik at baseURL er resolvert
    await page.goto("/no");

    for (const href of ["/no/register", "/no/about"]) {
      const res = await page.request.get(href);
      expect(res.status()).toBe(200);
    }
  });
});
