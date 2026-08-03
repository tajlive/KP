import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loginWithCredentials } from "../helpers/auth";
import dotenv from "dotenv";
import path from "path";

/**
 * P&L-korrekthet: Dashboardets P&L må stemme med Supabase DB (innenfor 1 % margin).
 *
 * Kontekst: Etter valuta-buggen (2026-08-02 → 2026-08-03) og P/L-proxy-buggen må vi
 * verifisere at tallene brukeren ser på dashboardet er de samme som DB sier:
 *
 *   1. Hero-P&L % ("Siste endring") = (konto-balanse − startkapital) / startkapital × 100
 *      — balanse = SUM(current_capital_nok) over aktive paper-sesjoner, ellers
 *        paper_accounts.current_balance (samme logikk som getAccountBalance i
 *        getUserDashboardMetrics — SSoT).
 *   2. "Total avkastning"-kortet (realisert P&L, NOK) = RPC get_dashboard_metrics.total_pnl
 *      med samme scope som /api/dashboard/metrics bruker (default "all").
 *
 * NB: Naiv first-match på /[-+]?\d+\.?\d*%/ over hele body er upålitelig —
 * PriceTicker viser også prosenter (markedsdata). Vi skoper til hero-pillen
 * ("Siste endring" i SimplifiedHero).
 *
 * Playwright laster IKKE .env.local automatisk — vi laster den eksplisitt
 * (service-role-nøkkelen brukes kun lokalt i testen, aldri committes).
 */

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const TEST_EMAIL = "test+tricky+123@klarpakke.no";
const TEST_PASSWORD = "TestTest123!";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Global storageState (.auth/user.json) er en utløpt sesjon for en annen bruker —
// vi logger inn som testbrukeren med fersk kontekst (samme mønster som currency-contract).
test.use({ storageState: { cookies: [], origins: [] } });

/** Hent bruker-id for den innloggede testbrukeren via /api/auth/me (server-verifisert). */
async function resolveUserId(page: Page): Promise<string> {
  const res = await page.request.get("/api/auth/me");
  expect(res.ok(), "/api/auth/me må returnere innlogget bruker").toBeTruthy();
  const json = (await res.json()) as { user?: { id?: string; email?: string | null } };
  expect(json?.user?.email, "Innlogget bruker matcher ikke testbrukeren").toBe(TEST_EMAIL);
  expect(json?.user?.id, "Fant ikke user.id fra /api/auth/me").toBeTruthy();
  return json.user!.id!;
}

/**
 * Hent DB-sannheten for hero-P&L %:
 * balanse = SUM(current_capital_nok) over aktive paper-sesjoner (fallback:
 * paper_accounts.current_balance), startkapital = paper_accounts.initial_balance.
 * Replikerer getAccountBalance/getAccountInitial i getUserDashboardMetrics.
 */
async function fetchAccountPnl(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ accountBalance: number; initialBalance: number; dbPnlPct: number }> {
  const { data: activeSessions } = await supabase
    .from("trading_sessions")
    .select("current_capital_nok, open_position")
    .eq("user_id", userId)
    .eq("mode", "paper")
    .eq("status", "active");

  let accountBalance = 0;
  let invested = 0;
  for (const s of activeSessions ?? []) {
    accountBalance += Number(s.current_capital_nok ?? 0);
    const pos = s.open_position as { quantity?: number; entry_price?: number } | null;
    if (pos?.quantity && pos?.entry_price) invested += pos.quantity * pos.entry_price;
  }
  if (!(Number.isFinite(accountBalance + invested) && accountBalance + invested > 0)) {
    const { data: pa } = await supabase
      .from("paper_accounts")
      .select("current_balance")
      .eq("user_id", userId)
      .maybeSingle();
    accountBalance = Number(pa?.current_balance ?? 0);
  }

  const { data: pa } = await supabase
    .from("paper_accounts")
    .select("initial_balance")
    .eq("user_id", userId)
    .maybeSingle();
  // App-fallback: 100 000 kr (getProfileFallback) hvis initial_balance mangler
  const initialBalance = Number(pa?.initial_balance ?? 100_000);
  expect(initialBalance, `initial_balance mangler/ugyldig for ${TEST_EMAIL}`).toBeGreaterThan(0);

  return {
    accountBalance,
    initialBalance,
    dbPnlPct: ((accountBalance - initialBalance) / initialBalance) * 100,
  };
}

test.describe("P&L-korrekthet — Dashboard P&L stemmer med DB", () => {
  test("Hero-P&L % og Total avkastning stemmer med Supabase DB innenfor 1 % margin", async ({
    page,
  }) => {
    test.skip(
      !SUPABASE_URL || !SERVICE_ROLE_KEY,
      "Mangler DB-nøkler — kjør med .env.local (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)",
    );

    // 1) Logg inn som testbruker og åpne dashboardet
    await loginWithCredentials(page, TEST_EMAIL, TEST_PASSWORD);
    await page.goto("/no/dashboard", { waitUntil: "domcontentloaded" });

    // Vent til dashboardet har rendret NOK-balanse (hero / ticker)
    await expect(page.locator("body")).toContainText(/\d{1,3}(?:\s\d{3})*(?:,\d{2})?\s?kr/, {
      timeout: 20_000,
    });

    // 2) Hent P&L % fra UI — hero-pillen ("Siste endring", SimplifiedHero).
    //    Teksten matcher planens mønster /[-+]?\d+\.?\d*%/, men skopet til
    //    P&L-pillen (ikke PriceTicker).
    const heroPill = page.getByText("Siste endring").locator("..").first();
    await expect(heroPill).toBeVisible({ timeout: 10_000 });
    const uiText = (await heroPill.innerText()).trim();
    const uiMatch = uiText.match(/[-+]?\d+\.?\d*%/);
    expect(uiMatch, `Fant ikke P&L-%-tekst i hero-pillen: "${uiText}"`).not.toBeNull();
    const uiPnlPct = parseFloat(uiMatch![0].replace("%", ""));

    // 3) Hent P&L fra DB via Supabase RPC get_dashboard_metrics (+ konto-SSoT)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userId = await resolveUserId(page);

    // 3a) RPC med samme scope som /api/dashboard/metrics (default "all")
    const { data: rpcRows, error: rpcError } = await supabase.rpc("get_dashboard_metrics", {
      p_user_id: userId,
      p_mode: "paper",
      p_statuses: ["active", "paused", "crashed", "stopped"],
    });
    expect(rpcError, `RPC get_dashboard_metrics feilet: ${rpcError?.message}`).toBeNull();
    const totalPnlDb = Number(rpcRows?.[0]?.total_pnl ?? 0);

    // 3b) Konto-sannhet for hero-%-en
    const { accountBalance, initialBalance, dbPnlPct } = await fetchAccountPnl(supabase, userId);
    expect(Number.isFinite(dbPnlPct), `Kunne ikke beregne DB-P&L (balanse=${accountBalance})`).toBe(true);

    // 3c) UI "Total avkastning"-kortet (realisert P&L i NOK)
    const totalReturnCard = page.getByText("Total avkastning").locator("..").first();
    await expect(totalReturnCard).toBeVisible({ timeout: 10_000 });
    const cardText = (await totalReturnCard.innerText()).replace(/\u2212/g, "-");
    const cardMatch = cardText.match(/([-+]?\d[\d\s.,]*)\s?kr/);
    expect(
      cardMatch,
      `Fant ikke kr-beløp i "Total avkastning"-kortet: "${cardText}"`,
    ).not.toBeNull();
    const uiTotalPnl = parseFloat(cardMatch![1].replace(/[\s\u00A0\u202F]/g, "").replace(",", "."));

    // 4) Verifiser diff <= 1 % margin
    //    Margin = 1 % relativt av DB-verdien, med 1 pp / 1 kr absolutt-gulv
    //    (beskytter mot toFixed(2)-avrunding når DB-verdien er nær null).
    const heroDiff = Math.abs(uiPnlPct - dbPnlPct);
    const heroMargin = Math.max(1, Math.abs(dbPnlPct) * 0.01);
    expect(
      heroDiff,
      `Hero-P&L %: UI viser ${uiPnlPct}% — DB sier ${dbPnlPct.toFixed(2)}% ` +
        `(balanse ${accountBalance} kr, start ${initialBalance} kr; avvik ${heroDiff.toFixed(2)} pp)`,
    ).toBeLessThanOrEqual(heroMargin);

    const pnlDiff = Math.abs(uiTotalPnl - totalPnlDb);
    const pnlMargin = Math.max(1, Math.abs(totalPnlDb) * 0.01);
    expect(
      pnlDiff,
      `Total avkastning: UI viser ${uiTotalPnl} kr — RPC total_pnl sier ${totalPnlDb} kr ` +
        `(avvik ${pnlDiff.toFixed(2)} kr). ` +
        (totalPnlDb < 0 && uiTotalPnl >= 0
          ? "Mistenkt rotårsak: DashboardPro/AdaptiveDashboard renderer Math.abs(totalPnl) " +
            "uten '−'-prefiks for negativ P&L (kun '+'-prefiks for positiv)."
          : ""),
    ).toBeLessThanOrEqual(pnlMargin);

    // Logg for rapporten
    console.log(
      `✅ P&L OK: hero ${uiPnlPct}% vs DB ${dbPnlPct.toFixed(2)}% ` +
        `| total ${uiTotalPnl} kr vs RPC ${totalPnlDb} kr (${rpcRows?.[0]?.total_trades} trades)`,
    );
  });
});
