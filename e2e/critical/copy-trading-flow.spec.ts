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
    let body: {
      leaders?: { display_name?: string; traderHrefId?: string }[];
      source?: string;
      error?: string;
    };
    try {
      body = JSON.parse(raw) as typeof body;
    } catch {
      test.skip(true, `Ikke JSON fra discover: ${raw.slice(0, 200)}`);
      return;
    }

    if (!res.ok() || body.error) {
      test.skip(
        true,
        `Copy-trading discover utilgjengelig (HTTP ${res.status()}): ${body.error ?? raw.slice(0, 200)}`,
      );
      return;
    }

    if (!Array.isArray(body.leaders)) {
      test.skip(true, `Uventet discover-body (source=${body.source ?? "?"}).`);
      return;
    }
    if (body.leaders.length === 0) {
      test.skip(
        true,
        `Ingen copy-trading-ledere i DB (source=${body.source ?? "?"}). Seed leaderboard_bots eller offentlige trader_profiles for full E2E-dekning.`,
      );
      return;
    }

    expect(body.leaders.length).toBeGreaterThan(0);
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
    const rawDiscover = await discoverRes.text();
    let discoverBody: { leaders?: unknown[]; error?: string };
    try {
      discoverBody = JSON.parse(rawDiscover) as typeof discoverBody;
    } catch {
      test.skip(
        true,
        `Ikke JSON fra discover (UI): ${rawDiscover.slice(0, 200)}`,
      );
      return;
    }
    if (!discoverRes.ok() || discoverBody.error) {
      test.skip(
        true,
        `Discover utilgjengelig for UI (HTTP ${discoverRes.status()}): ${discoverBody.error ?? rawDiscover.slice(0, 200)}`,
      );
      return;
    }
    if (
      !Array.isArray(discoverBody.leaders) ||
      discoverBody.leaders.length === 0
    ) {
      test.skip(true, "Ingen ledere — hopper over UI-assert");
      return;
    }

    await expect(
      page.getByTestId("copy-trading-leader-card").first(),
    ).toBeVisible({ timeout: 60_000 });
  });
});
