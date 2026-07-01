/**
 * Paper trading execute.
 * Accepts either { pair, side, amount_nok } or { symbol, side, quantity, price }.
 * Used by paper-trading UI (hub, session detail), FirstTradeCard, and PaperTradeButton.
 */

import { executeTrade } from "@/lib/trading/safety";
import { paperExecuteSuccessResponseSchema } from "@/lib/trading/safety/paper-execute-success-response";
import { getUsdtToNokRateAsync } from "@/lib/trading/currency";
import { createServerClient } from "@/lib/supabase/server";
import { createBinanceMarketDataProvider } from "@/lib/trading/canonical/market-data";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

      let fetchedPrice: number;
      try {
        const provider = createBinanceMarketDataProvider();
        fetchedPrice = await provider.getPrice(symbol);
      } catch (priceErr) {
        console.error(`[paper-trading/execute] Failed to fetch price for ${symbol}:`, priceErr);
        return NextResponse.json(
          { error: "Kunne ikke hente pris for " + symbol },
          { status: 502 },
        );
      }

      const rate = await getUsdtToNokRateAsync(supabase);
      if (!Number.isFinite(fetchedPrice) || fetchedPrice <= 0) {
        return NextResponse.json(
          { error: "Ugyldig pris for " + symbol },
          { status: 502 },
        );
      }

      if (!Number.isFinite(rate) || rate <= 0) {
        return NextResponse.json(
          { error: "Kunne ikke hente USDT/NOK kurs" },
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
