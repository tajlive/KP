import { createServerClient } from "@/lib/supabase/server";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  type MeTradeRow,
  meTradeRowSchema,
  meTradesSuccessSchema,
} from "@/lib/trading/me-trades-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 200;

export async function GET(request: NextRequest) {
  const diagnostic_id = randomUUID();

  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false as const, error: "Unauthorized", diagnostic_id },
        { status: 401 },
      );
    }

    const limitParam = request.nextUrl.searchParams.get("limit");
    let limit = DEFAULT_LIMIT;
    if (limitParam != null) {
      const n = Number.parseInt(limitParam, 10);
      if (Number.isFinite(n)) {
        limit = Math.min(MAX_LIMIT, Math.max(1, n));
      }
    }

    // Eksplisitt session_id-parameter: brukes av sesjon-detaljvisninger.
    // Da hentes handler for akkurat den sesjonen (også arkivert — brukeren
    // har eksplisitt bedt om detaljene), fortsatt user_id-scopet.
    const sessionIdParam = request.nextUrl.searchParams.get("session_id");
    const sessionIdValid =
      sessionIdParam != null &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sessionIdParam,
      );

    let sessionIds: string[];
    // Sesjoner som har LEVENDE posisjoner (active/paused). Stoppede og
    // arkiverte sesjoner er fryst historikk — trades fra dem vises i
    // ledgeren, men deres kjøp er ALDRI «åpne posisjoner» (fantom-
    // posisjoner, samme klasse som portfolio/summary-fiksen 2026-08-10:
    // Tom så ADA/BTC-posisjoner fra stoppede sesjoner som levende penger).
    let liveSessionIds: string[] = [];
    if (sessionIdValid) {
      sessionIds = [sessionIdParam];
      liveSessionIds = [sessionIdParam];
    } else {
      // Handelshistorikken er en LEDGER: den må ALDRI miste rader. Derfor
      // hentes trades fra ALLE brukerens sesjoner — også arkiverte. Stopp
      // av en bot arkiverer sesjonen, og et archived-filter her fikk
      // brukerens egne handler til å forsvinne fra historikken (E2E-funn
      // F6: ETH-kjøp 2026-07-25 usynlig etter stopp). Arkivering filtreres
      // i VISNINGER (bot-lister), ikke i regnskapet.
      const { data: sessions } = await supabase
        .from("trading_sessions")
        .select("id, status")
        .eq("user_id", user.id);

      sessionIds = (sessions ?? []).map((s) => s.id);
      liveSessionIds = (sessions ?? [])
        .filter((s) => s.status === "active" || s.status === "paused")
        .map((s) => s.id);
      if (sessionIds.length === 0) {
        return NextResponse.json(
          { ok: true as const, trades: [], diagnostic_id, limit },
          { status: 200 },
        );
      }
    }

    const { data, error } = await supabase
      .from("trades")
      .select(
        "id, trading_pair, side, quantity, price, total_value, realized_pnl, mode, status, created_at, executed_at, strategy_signal, session_id, fee, order_type",
      )
      .eq("user_id", user.id)
      .in("session_id", sessionIds)
      // KONTRAKT (P1-D, 2026-08-11): Historikk er en LEDGER — INGEN
      // forurensings-cutoff her, bevisst. Rå rader vises som de er, så
      // brukerens egne handler aldri forsvinner. Resultater-siden
      // (/api/user/trading-analytics) bruker derimot getCleanTrades med
      // CONTAMINATION_CUTOFF + oversell-clamp — tallene kan derfor avvike
      // for trades før 2026-07-30. Det er DESIGN, ikke bug: ledger viser
      // alt, analytics viser rensede tall. Ikke fjern cutoff-forskjellen.
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        {
          ok: false as const,
          error: error.message || "trades_query_failed",
          diagnostic_id,
        },
        { status: 500 },
      );
    }

    const rawRows = data ?? [];
    const trades: MeTradeRow[] = [];
    for (const row of rawRows) {
      const parsed = meTradeRowSchema.safeParse(row);
      if (parsed.success) {
        trades.push(parsed.data);
      }
    }

    // UI-A: åpne posisjoner (FIFO) m/ urealisert P&L. Pris-feil skal
    // aldri knekke API-et — fall tilbake til current_price_nok: null.
    // P1 (2026-08-11): posisjoner bygges KUN fra trades i levende sesjoner
    // (liveSessionIds = active/paused). Stoppede/arkiverte sesjoner er
    // fryst historikk — deres kjøp er fantom-posisjoner, ikke penger
    // brukeren har (Tom så ADA 3 253 kr + BTC 1 330 kr fra stoppede
    // sesjoner som «åpne posisjoner» på Historikk-siden).
    const positionTrades = liveSessionIds.length
      ? trades.filter(
          (t) => t.session_id && liveSessionIds.includes(t.session_id),
        )
      : [];
    let positions: import("@/lib/trading/me-trades-api").MePosition[] = [];
    try {
      const { computePositionsFromTrades } =
        await import("@/lib/trading/positions-from-trades");
      const computed = computePositionsFromTrades(positionTrades);
      if (computed.length > 0) {
        const { KrakenMarketDataProvider } =
          await import("@/lib/trading/canonical/market-data");
        const { getUsdtToNokRateAsync } =
          await import("@/lib/trading/currency");
        const provider = new KrakenMarketDataProvider();
        const rate = await getUsdtToNokRateAsync(supabase);

        positions = await Promise.all(
          computed.map(async (p) => {
            let priceNok: number | null = null;
            try {
              const klines = await provider.getKlines(p.pair, "1h", 1);
              const closeUsdt = klines?.[klines.length - 1]?.close;
              if (typeof closeUsdt === "number" && Number.isFinite(closeUsdt)) {
                priceNok = closeUsdt * rate;
              }
            } catch {
              // pris utilgjengelig → null
            }
            const marketValue = priceNok != null ? p.quantity * priceNok : null;
            const unrealizedPnl =
              marketValue != null ? marketValue - p.cost_basis_nok : null;
            return {
              pair: p.pair,
              quantity: p.quantity,
              avg_entry_price: p.avg_entry_price,
              cost_basis_nok: p.cost_basis_nok,
              oldest_entry_at: p.oldest_entry_at,
              current_price_nok: priceNok,
              market_value_nok: marketValue,
              unrealized_pnl_nok: unrealizedPnl,
              unrealized_pnl_pct:
                unrealizedPnl != null && p.cost_basis_nok > 0
                  ? (unrealizedPnl / p.cost_basis_nok) * 100
                  : null,
            };
          }),
        );
      }
    } catch (posErr) {
      console.error("[user/trades] positions-aggregering feilet:", posErr);
    }

    const body = {
      ok: true as const,
      diagnostic_id,
      trades,
      positions,
      limit,
    };
    meTradesSuccessSchema.parse(body);

    return NextResponse.json(body, {
      headers: { "X-Diagnostic-Id": diagnostic_id },
    });
  } catch {
    return NextResponse.json(
      {
        ok: false as const,
        error: "internal_error",
        diagnostic_id,
      },
      { status: 500 },
    );
  }
}
