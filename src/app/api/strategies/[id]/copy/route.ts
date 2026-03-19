import { createServerClient } from "@/lib/supabase/server";
import {
  copyStrategyRequestSchema,
  riskLevelToStrategyId,
} from "@/lib/strategies/copy-strategy-schema";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_SESSION_STRATEGY_IDS = [
  "dca_trygg",
  "trend_balansert",
  "multisignal_aktiv",
  "grid_bot",
  "ai_copy",
] as const;

type SessionStrategyId = (typeof VALID_SESSION_STRATEGY_IDS)[number];

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<
  NextResponse<
    | { sessionId: string; message: string }
    | { error: string; details?: unknown }
  >
> {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: listingId } = await context.params;

  const idParse = z.string().uuid().safeParse(listingId);
  if (!idParse.success) {
    return NextResponse.json({ error: "Invalid strategy id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = copyStrategyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { capitalAllocationNok, riskLevel, autoStopLoss, stopLossPercent } =
    parsed.data;

  const { data: listing, error: listingError } = await supabase
    .from("marketplace_listings")
    .select("id, seller_id, category, title, backtest_summary")
    .eq("id", listingId)
    .eq("status", "published")
    .maybeSingle();

  if (listingError || !listing) {
    return NextResponse.json(
      { error: "Listing not found or not published" },
      { status: 404 },
    );
  }

  const categoryHint = listing.category?.trim();
  const fromRisk = riskLevelToStrategyId(riskLevel);
  const resolvedStrategyId: SessionStrategyId =
    categoryHint &&
    (VALID_SESSION_STRATEGY_IDS as readonly string[]).includes(categoryHint)
      ? (categoryHint as SessionStrategyId)
      : fromRisk;

  await supabase
    .from("trading_sessions")
    .update({
      status: "stopped",
      stopped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("mode", "paper")
    .eq("status", "active");

  const backtest =
    typeof listing.backtest_summary === "object" &&
    listing.backtest_summary !== null
      ? (listing.backtest_summary as Record<string, unknown>)
      : {};

  const strategy_config = {
    ...backtest,
    source: "marketplace_copy",
    listing_id: listingId,
    listing_title: listing.title,
    capital_allocation_nok: capitalAllocationNok,
    risk_level: riskLevel,
    auto_stop_loss: autoStopLoss,
    stop_loss_percent: autoStopLoss ? stopLossPercent : null,
  };

  const { data: sessionRow, error: insertError } = await supabase
    .from("trading_sessions")
    .insert({
      user_id: user.id,
      mode: "paper",
      status: "active",
      copied_from_listing_id: listingId,
      strategy_id: resolvedStrategyId,
      strategy_config,
      trading_pair: "BTC/USDT",
      initial_capital: capitalAllocationNok,
      current_capital: capitalAllocationNok,
      starting_capital_nok: capitalAllocationNok,
      current_capital_nok: capitalAllocationNok,
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      crash_count: 0,
      total_pnl: 0,
      started_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
      risk_level: riskLevel,
    })
    .select("id")
    .single();

  if (insertError || !sessionRow) {
    console.error("copy strategy insert:", insertError);
    return NextResponse.json(
      { error: "Could not create trading session" },
      { status: 500 },
    );
  }

  const { error: subErr } = await supabase
    .from("marketplace_subscriptions")
    .insert({
      subscriber_id: user.id,
      listing_id: listingId,
      status: "active",
      started_at: new Date().toISOString(),
    });

  if (subErr) {
    console.warn("marketplace_subscriptions insert:", subErr.message);
  }

  return NextResponse.json({
    sessionId: sessionRow.id,
    message: "ok",
  });
}
