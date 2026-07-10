import { test, expect } from "@playwright/test";

const BASE = "https://www.klarpakke.no";

test("Logg inn som Tom og sjekk dashboard", async ({ page }) => {
  // Login
  await page.goto(`${BASE}/no/login`);
  await page.locator('input[type="email"]').first().fill("tomarnejensen@gmail.com");
  await page.locator('input[type="password"]').first().fill("TestPass2026!");
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL("**/dashboard**", { timeout: 15000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2000);

  const content = await page.content();
  
  // Sjekk saldo — skal være 92K, ikke 5.5M
  console.log("\n=== SALDO ===");
  const has92k = content.includes("92") && (content.includes("176") || content.includes(" 176"));
  const has5M = content.includes("5") && content.includes("577") && content.includes("655");
  console.log(`  92K synlig: ${has92k}`);
  console.log(`  5.5M synlig: ${has5M}`);
  
  // Sjekk sessions
  console.log("\n=== SESSIONS ===");
  const hasNoSessions = content.includes("Ingen sesjoner");
  console.log(`  "Ingen sesjoner": ${hasNoSessions}`);
  
  // Finn alle tall i dashboard-området
  const texts = await page.locator('text=/\\d+[\\s\\d]*,\\d+|\\d+[\\s\\d]+kr/i').allTextContents();
  console.log(`\n=== TALL PÅ SIDEN ===`);
  for (const t of texts.slice(0, 20)) {
    console.log(`  ${t}`);
  }
  
  // Sjekk worker crash
  expect(content).not.toMatch(/Feilkode: \d{7,}/);
  
  // Ta screenshot for debugging
  await page.screenshot({ path: "test-results/tom-dashboard.png" });
  console.log("\n📸 Screenshot: test-results/tom-dashboard.png");
});
