/**
 * Paper trading execute.
 * Accepts either { pair, side, amount_nok } or { symbol, side, quantity, price }.
 * Used by paper-trading UI (hub, session detail), FirstTradeCard, and PaperTradeButton.
 *
 * Rate-limited: max 10 requests per second per user (in-memory sliding window).
 */

import { executeTrade } from "@/lib/trading/safety";
import { paperExecuteSuccessResponseSchema } from "@/lib/trading/safety/paper-execute-success-response";
import { getUsdtToNokRateAsync } from "@/lib/trading/currency";
import { rejectIfImpersonating } from "@/lib/admin/impersonation-guard";
import { createServerClient } from "@/lib/supabase/server";
import { createKrakenMarketDataProvider } from "@/lib/trading/canonical/market-data";
import { syncPaperAccountBalance } from "@/lib/trading/core/paper-account-sync";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ── In-memory sliding-window rate limiter ──────────────────────
// Max 10 requests per second per user ID.
// Shared across all requests hitting this process (per-instance).
// På serverless (Vercel/Cloudflare) gjelder limiteren per isolat — ikke per global bruker.
const WINDOW_MS = 1000;
const MAX_RPS = 10;

interface RateBucket {
  timestamps: number[];
}

const rateBuckets = new Map<string, RateBucket>();

// Periodisk cleanup for å unngå minnelekkasje (kjører hvert 60. sekund)
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - WINDOW_MS * 2; // behold 2 vinduer
    for (const [key, bucket] of rateBuckets) {
      bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
      if (bucket.timestamps.length === 0) {
        rateBuckets.delete(key);
      }
    }
    // Stopp timeren hvis helt tomt
    if (rateBuckets.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, 60_000);
}

function checkRateLimit(userId: string): {
  allowed: boolean;
  retryAfterMs: number;
} {
  const now = Date.now();
  let bucket = rateBuckets.get(userId);
  if (!bucket) {
    bucket = { timestamps: [] };
    rateBuckets.set(userId, bucket);
    ensureCleanup();
  }

  // Fjern foreldede timestamps
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);

  if (bucket.timestamps.length >= MAX_RPS) {
    const oldest = bucket.timestamps[0];
    const retryAfterMs = WINDOW_MS - (now - oldest);
    return { allowed: false, retryAfterMs: Math.max(1, retryAfterMs) };
  }

  bucket.timestamps.push(now);
  return { allowed: true, retryAfterMs: 0 };
}

const optionalPaperSession = z.object({
  session_id: z.string().uuid().optional(),
});

const schemaAmountNok = z.object({
  pair: z.string().min(1).max(20),
  side: z.enum(["buy", "sell"]),
  amount_nok: z.number().positive(),
});

const schemaQtyPrice = z.object({
  symbol: z.string().min(1).max(20),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
  price: z.number().positive(),
  botId: z.string().uuid().optional(),
});

const bodySchema = z.union([
  schemaAmountNok.merge(optionalPaperSession),
  schemaQtyPrice.merge(optionalPaperSession),
]);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Rate-limit: maks 10 req/s per bruker ─────────────────
    const { allowed, retryAfterMs } = checkRateLimit(user.id);
    if (!allowed) {
      return NextResponse.json(
        {
          error: "For mange forespørsler. Vent før du prøver igjen.",
          retryAfterMs,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
            "X-RateLimit-Limit": String(MAX_RPS),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    const impersonation = await rejectIfImpersonating(request);
    if (impersonation) return impersonation;

    // request.json() kan kaste (tom body / avbrutt stream) og krasjer ellers Next dev under load.
    // Vi leser raw text og parser eksplisitt for å returnere 400 i stedet for 500.
    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json(
        { error: "Invalid request", details: { formErrors: ["Empty body"] } },
        { status: 400 },
      );
    }
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid request", details: { formErrors: ["Invalid JSON"] } },
        { status: 400 },
      );
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { side } = parsed.data;
    let symbol: string;
    let quantity: number;
    let price: number;

    if ("amount_nok" in parsed.data) {
      const { pair, amount_nok } = parsed.data;
      symbol = pair.toUpperCase().replace("/", "");

      // Rate hentes FØR prisen — DB-fallbacken lagrer NOK-priser og må
      // konverteres til USDT (2026-08-19: behandlet NOK som USDT → ~9,5× for
      // liten quantity når live-kilden feilet).
      const rate = await getUsdtToNokRateAsync(supabase);
      if (!Number.isFinite(rate) || rate <= 0) {
        return NextResponse.json(
          { error: "Kunne ikke hente USDT/NOK kurs" },
          { status: 502 },
        );
      }

      let fetchedPrice: number;
      try {
        // EU/EØS (2026): Kraken public API — eneste tallkilde
        const provider = createKrakenMarketDataProvider();
        fetchedPrice = await provider.getPrice(symbol);
      } catch (proxyErr) {
        console.warn(
          `[paper-trading/execute] Kraken failed for ${symbol}:`,
          proxyErr,
        );
        // Fallback: DB-priser (cachet av cron-jobb). coin_prices.price er NOK
        // (sync-prices konverterer) — del på rate for å få USDT.
        try {
          const { data: dbPrice } = await supabase
            .from("coin_prices")
            .select("price")
            .eq("symbol", symbol)
            .single();
          if (dbPrice?.price && Number(dbPrice.price) > 0) {
            fetchedPrice = Number(dbPrice.price) / rate;
          } else {
            return NextResponse.json(
              {
                error: `Kunne ikke hente pris for ${symbol} — prøv igjen om litt`,
              },
              { status: 502 },
            );
          }
        } catch {
          return NextResponse.json(
            {
              error: `Kunne ikke hente pris for ${symbol} — prøv igjen om litt`,
            },
            { status: 502 },
          );
        }
      }

      if (!Number.isFinite(fetchedPrice) || fetchedPrice <= 0) {
        return NextResponse.json(
          { error: "Ugyldig pris for " + symbol },
          { status: 502 },
        );
      }

      const amountUsdt = amount_nok / rate;
      const computedQty = amountUsdt / fetchedPrice;
      if (computedQty <= 0 || !Number.isFinite(computedQty)) {
        return NextResponse.json(
          { error: "Ugyldig beløp eller mengde" },
          { status: 400 },
        );
      }

      price = fetchedPrice;
      quantity = computedQty;
    } else {
      const { symbol: s, quantity: q, price: p } = parsed.data;
      symbol = s.toUpperCase();
      quantity = q;
      price = p;
    }

    const result = await executeTrade(supabase, {
      userId: user.id,
      symbol,
      side,
      quantity,
      price,
      orderType: "market",
      mode: "paper",
      botId: "botId" in parsed.data ? parsed.data.botId : undefined,
      sessionId: parsed.data.session_id,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          rejectionReason: result.rejectionReason,
          type: "TRADE_REJECTED",
        },
        { status: 200 },
      );
    }

    // Synkroniser paper_accounts etter vellykket trade
    syncPaperAccountBalance(supabase, user.id).catch(() => {
      // Fire-and-forget — ikke la sync-feil blokkere trade-responsen
    });

    const successPayload = {
      success: true as const,
      trade_id: result.tradeId,
      session_id: result.sessionId,
      new_balance: result.newBalance ?? 0,
    };
    const validated =
      paperExecuteSuccessResponseSchema.safeParse(successPayload);
    if (!validated.success) {
      console.error(
        "[PaperExecute] Success response contract violation:",
        validated.error.flatten(),
      );
      return NextResponse.json(
        { error: "Intern feil: ugyldig handlerespons" },
        { status: 500 },
      );
    }
    return NextResponse.json(validated.data);
  } catch (err) {
    console.error("[PaperExecute] Unexpected error:", err);
    return NextResponse.json(
      { error: "Kunne ikke utføre handel" },
      { status: 500 },
    );
  }
}
