/**
 * Krever innlogget E2E-bruker (storageState fra auth.setup.ts).
 * Bevis: discover-API returnerer minst én leder (bots eller offentlige trader_profiles).
 */
import { expect, test } from "@playwright/test";

test.describe("Critical: Copy trading @critical @copyTrading", () => {
  test("discover API: 200 og minst én leder", async ({ page, baseURL }) => {
    await page.goto("/no/copy-trading/discover", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });

    if (page.url().includes("innlogging") || page.url().includes("/login")) {
      test.skip(
        true,
        "Ikke innlogget — sett E2E_USER_EMAIL / E2E_USER_PASSWORD",
      );
    }

    const origin = baseURL ?? new URL(page.url()).origin;
    const res = await page.request.get(
      `${origin}/api/copy-trading/discover?timeframe=30d&limit=24`,
    );

    const raw = await res.text();
    expect.soft(res.status(), raw).toBe(200);

    const body = JSON.parse(raw) as {
      leaders: { display_name?: string; traderHrefId?: string }[];
      source?: string;
    };

    expect(Array.isArray(body.leaders)).toBe(true);
    expect(
      body.leaders.length,
      `Forvent minst én leder (source=${body.source ?? "?"}). Legg til leaderboard_bots eller offentlig trader_profiles.`,
    ).toBeGreaterThan(0);
  });

  test("discover UI: synlig leader-kort", async ({ page }) => {
    await page.goto("/no/copy-trading/discover", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });

    if (page.url().includes("innlogging") || page.url().includes("/login")) {
      test.skip(true, "Ikke innlogget");
    }

    await expect(
      page.getByTestId("copy-trading-leader-card").first(),
    ).toBeVisible({ timeout: 60_000 });
  });
});
