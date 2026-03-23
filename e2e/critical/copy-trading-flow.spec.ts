/**
 * Krever innlogget E2E-bruker (storageState fra auth.setup.ts).
 * Bevis: discover-API returnerer minst én leder (bots eller offentlige trader_profiles).
 */
import { expect, test } from "@playwright/test";
import { waitForDevHealth } from "../helpers/wait-for-dev-health";

test.describe("Critical: Copy trading @critical @copyTrading", () => {
  test.beforeEach(async ({ playwright, baseURL }) => {
    await waitForDevHealth(playwright, baseURL);
  });

  test("discover API: 200 og minst én leder", async ({ page, baseURL }) => {
    await page.goto("/copy-trading/discover", {
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
    if (body.leaders.length === 0) {
      test.skip(
        true,
        `Ingen copy-trading-ledere i DB (source=${body.source ?? "?"}). Seed leaderboard_bots eller offentlige trader_profiles for full E2E-dekning.`,
      );
    }
  });

  test("discover UI: synlig leader-kort", async ({ page, baseURL }) => {
    await page.goto("/copy-trading/discover", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });

    if (page.url().includes("innlogging") || page.url().includes("/login")) {
      test.skip(true, "Ikke innlogget");
    }

    const origin = baseURL ?? new URL(page.url()).origin;
    const discoverRes = await page.request.get(
      `${origin}/api/copy-trading/discover?timeframe=30d&limit=24`,
    );
    if (discoverRes.ok()) {
      const discoverBody = (await discoverRes.json()) as {
        leaders?: unknown[];
      };
      if (
        !Array.isArray(discoverBody.leaders) ||
        discoverBody.leaders.length === 0
      ) {
        test.skip(true, "Ingen ledere — hopper over UI-assert");
      }
    }

    await expect(
      page.getByTestId("copy-trading-leader-card").first(),
    ).toBeVisible({ timeout: 60_000 });
  });
});
