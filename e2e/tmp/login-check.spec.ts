import { test, expect } from "@playwright/test";

test("login page loads without invalid API key error", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", err => errors.push(err.message));
  await page.goto("https://www.klarpakke.no/no/login", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);
  const url = page.url();
  expect(url).not.toContain("Invalid+API+key");
  const apiKeyErrors = errors.filter(e => e.includes("Invalid API key") || e.includes("t is not defined"));
  expect(apiKeyErrors).toEqual([]);
});
