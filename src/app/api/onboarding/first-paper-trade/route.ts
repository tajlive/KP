import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createClient } from "@/lib/supabase/server";
import {
  jsonSuccess,
  unauthorized,
  internalError,
  badRequest,
  conflict,
} from "@/lib/api-response";
import { FIRST_TRADE_SYMBOL } from "@/lib/onboarding/constants";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
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

  const { amount } = parsed.data;
  const supabase = createClient();

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("onboarding_step, onboarding_completed, paper_balance")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("[first-paper-trade] profile fetch failed:", profileError);
    return internalError("Kunne ikke hente brukerprofil");
  }

  if (profile.onboarding_completed === true) {
    return conflict("Onboarding er allerede fullført", "ALREADY_COMPLETED");
  }

  if (profile.onboarding_step !== 3) {
    return badRequest("Onboarding er ikke klar for første trade");
  }

  if (amount > (profile.paper_balance ?? 0)) {
    return badRequest("Beløp overstiger paper-saldo", "INSUFFICIENT_BALANCE");
  }

  const priceRes = await fetch(
    `/api/market/binance-prices?symbols=${encodeURIComponent(FIRST_TRADE_SYMBOL)}`,
    { next: { revalidate: 0 } },
  );
  if (!priceRes.ok) {
    return internalError("Kunne ikke hente markedspris", {
      code: "MARKET_PRICE_ERROR",
    });
  }
  const priceBody = (await priceRes.json()) as {
    prices?: Array<{ symbol: string; price: number }>;
  };
  const requestedPrice = priceBody.prices?.[0]?.price ?? 0;
  if (requestedPrice <= 0) {
    return internalError("Kunne ikke hente markedspris", {
      code: "MARKET_PRICE_ERROR",
    });
  }

  const { data: tradeRows, error: rpcError } = await supabase.rpc(
    "place_paper_trade_with_slippage",
    {
      p_user_id: user.id,
      p_symbol: FIRST_TRADE_SYMBOL,
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
    symbol: FIRST_TRADE_SYMBOL,
    amount,
  });
}
