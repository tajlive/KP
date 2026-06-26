import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createClient } from "@/lib/supabase/server";
import {
  jsonSuccess,
  unauthorized,
  internalError,
  badRequest,
} from "@/lib/api-response";
import { z } from "zod";

const FIRST_TRADE_SYMBOL = "BTCUSDT";

const schema = z.object({
  symbol: z.string().min(1).default(FIRST_TRADE_SYMBOL),
  amount: z.number().positive().max(100_000),
});

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabaseAuth = createServerClient(request, response);
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();

  if (authError || !user) {
    return unauthorized("Ikke autentisert");
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Ugyldig handel");
  }

  const { symbol, amount } = parsed.data;
  const supabase = createClient();

  const binanceRes = await fetch(
    `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
    { next: { revalidate: 0 } },
  );
  if (!binanceRes.ok) {
    return internalError("Kunne ikke hente markedspris");
  }
  const binanceData = (await binanceRes.json()) as { lastPrice?: string };
  const requestedPrice = Number(binanceData.lastPrice) || 0;
  if (requestedPrice <= 0) {
    return internalError("Kunne ikke hente markedspris");
  }

  const { data: tradeRows, error: rpcError } = await supabase.rpc(
    "place_paper_trade_with_slippage",
    {
      p_user_id: user.id,
      p_symbol: symbol,
      p_side: "buy",
      p_order_type: "market",
      p_amount: amount,
      p_requested_price: requestedPrice,
    },
  );

  if (rpcError || !tradeRows?.length) {
    console.error("[first-paper-trade] RPC failed:", rpcError);
    return internalError("Kunne ikke gjennomføre paper trade");
  }

  const trade = tradeRows[0];

  const { error: updateError } = await supabase
    .from("user_profiles")
    .update({ onboarding_step: 4 })
    .eq("id", user.id);

  if (updateError) {
    console.error("[first-paper-trade] profile update failed:", updateError);
    return internalError("Kunne ikke oppdatere onboarding-status");
  }

  return jsonSuccess({
    tradeId: trade.trade_id,
    executionPrice: trade.execution_price,
    slippageBps: trade.slippage_bps,
    symbol,
    amount,
  });
}
