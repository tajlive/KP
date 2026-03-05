import { expect, test } from "@playwright/test";

test.describe("Locale/Language Tests", () => {
  const baseURL = process.env.TEST_BASE_URL || "http://localhost:3000";

  test("should display Norwegian content on /no", async ({ page }) => {
    await page.goto(`${baseURL}/no`);
    await page.waitForLoadState("networkidle");

    // Check html lang attribute
    const htmlLang = await page.evaluate(() => document.documentElement.lang);
    expect(htmlLang).toBe("no");

    // Check for Norwegian text (not English)
    const bodyText = await page.textContent("body");

    // Should contain Norwegian text
    expect(bodyText).toContain("Fra nybegynner til selvstendig trader");

    // Console should not have MISSING_MESSAGE errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("MISSING_MESSAGE")) {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a bit for any client-side errors
    await page.waitForTimeout(2000);

    expect(consoleErrors).toHaveLength(0);
  });

  test("should display English content on /en", async ({ page }) => {
    await page.goto(`${baseURL}/en`);
    await page.waitForLoadState("networkidle");

    // Check html lang attribute
    const htmlLang = await page.evaluate(() => document.documentElement.lang);
    expect(htmlLang).toBe("en");

    // Check for English text (not Norwegian)
    const bodyText = await page.textContent("body");

    // Should contain English text
    expect(bodyText).toContain("From beginner to independent trader");

    // Console should not have MISSING_MESSAGE errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("MISSING_MESSAGE")) {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    expect(consoleErrors).toHaveLength(0);
  });

  test("should display Thai content on /th", async ({ page }) => {
    await page.goto(`${baseURL}/th`);
    await page.waitForLoadState("networkidle");

    const htmlLang = await page.evaluate(() => document.documentElement.lang);
    expect(htmlLang).toBe("th");

    // Check no MISSING_MESSAGE errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("MISSING_MESSAGE")) {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    expect(consoleErrors).toHaveLength(0);
  });

  test("should display Chinese content on /zh", async ({ page }) => {
    await page.goto(`${baseURL}/zh`);
    await page.waitForLoadState("networkidle");

    const htmlLang = await page.evaluate(() => document.documentElement.lang);
    expect(htmlLang).toBe("zh");

    // Check no MISSING_MESSAGE errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("MISSING_MESSAGE")) {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    expect(consoleErrors).toHaveLength(0);
  });
});
