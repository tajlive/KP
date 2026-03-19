/**
 * Paper trading execute by amount in NOK (pair + side + amount_nok).
 * Used by TradingInterface and FirstTradeCard. Resolves price and quantity, then calls safety layer.
 */

import { executePaperTrade } from "@/lib/trading/safety";
import { getUsdtToNokRateAsync } from "@/lib/trading/currency";
import { createServerClient, createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

const bodySchema = z.union([schemaAmountNok, schemaQtyPrice]);

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabase = createServerClient(request, response);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
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

      const [priceRes, rate] = await Promise.all([
      fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
        { signal: AbortSignal.timeout(5000) },
      ),
      getUsdtToNokRateAsync(createClient()),
    ]);

    if (!priceRes.ok) {
      return NextResponse.json(
        { error: "Kunne ikke hente pris for " + symbol },
        { status: 502 },
      );
    }

    const priceData = await priceRes.json();
    const price = parseFloat(priceData?.price);
    if (!Number.isFinite(price) || price <= 0) {
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
    const quantity = amountUsdt / price;
    if (quantity <= 0 || !Number.isFinite(quantity)) {
      return NextResponse.json(
        { error: "Ugyldig beløp eller mengde" },
        { status: 400 },
      );
    }

    const result = await executePaperTrade({
      userId: user.id,
      symbol,
      side,
      quantity,
      price,
      orderType: "market",
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

    return NextResponse.json({
      success: true,
      trade_id: result.tradeId,
      new_balance: result.newBalance,
    });
  } catch (err) {
    console.error("[PaperExecute] Unexpected error:", err);
    return NextResponse.json(
      { error: "Kunne ikke utføre handel" },
      { status: 500 },
    );
  }
}
