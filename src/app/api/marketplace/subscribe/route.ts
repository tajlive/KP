// ============================================================================
// POST /api/marketplace/subscribe
// KLA-91: Subscribe to a marketplace listing
// Creates a user_strategies row cloned from the listing
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MarketplaceSubscribeSchema = z.object({
  listingId: z.string().uuid(),
  mode: z.enum(["paper", "live"]).default("paper"),
  initialCapital: z.number().positive().default(100000),
});

export interface MarketplaceSubscribeResponse {
  subscriptionId: string;
  userStrategyId: string;
  message: string;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<MarketplaceSubscribeResponse | { error: string }>> {
  try {
    const response = NextResponse.next();
    const supabase = createServerClient(request, response) as ReturnType<typeof import("@supabase/ssr").createServerClient>;

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please provide a valid authentication token." },
        { status: 401 },
      );
    }

    const userId = user.id;

    // Parse and validate request body
    const body = await request.json();
    const parsed = MarketplaceSubscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { listingId, mode, initialCapital } = parsed.data;

    // Fetch the marketplace listing
    const { data: listing, error: listingError } = await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("id", listingId)
      .eq("status", "published")
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found or not available" },
        { status: 404 },
      );
    }

    // Check if already subscribed
    const { data: existingSub } = await supabase
      .from("marketplace_subscriptions")
      .select("id")
      .eq("subscriber_id", userId)
      .eq("listing_id", listingId)
      .eq("status", "active")
      .single();

    if (existingSub) {
      return NextResponse.json(
        { error: "Already subscribed to this strategy" },
        { status: 409 },
      );
    }

    // Fetch the original strategy if strategy_id exists
    let strategyConfig = listing.backtest_summary || {};
    let strategyType = listing.category || "auto";
    let tradingPair = "BTC/USDT";

    if (listing.strategy_id) {
      const { data: originalStrategy } = await supabase
        .from("strategies" as any)
        .select("strategy_config, strategy_type, trading_pair, strategy_id")
        .eq("id", listing.strategy_id)
        .single();

      if (originalStrategy) {
        strategyConfig = originalStrategy.strategy_config || strategyConfig;
        strategyType =
          originalStrategy.strategy_type ||
          originalStrategy.strategy_id ||
          strategyType;
        tradingPair = originalStrategy.trading_pair || tradingPair;
      }
    }

    // Create user_strategies row cloned from the listing
    const { data: userStrategy, error: strategyError } = await supabase
      .from("strategies" as any)
      .insert({
        user_id: userId,
        mode,
        status: "active",
        strategy_type: strategyType,
        strategy_id: strategyType,
        initial_capital: initialCapital,
        current_capital: initialCapital,
        total_trades: 0,
        winning_trades: 0,
        total_pnl: 0,
        trading_pair: tradingPair,
        started_at: new Date().toISOString(),
        strategy_config: {
          ...strategyConfig,
          source: "marketplace",
          listing_id: listingId,
          seller_id: listing.seller_id,
        },
        is_public: false,
        is_marketplace_listed: false,
      })
      .select()
      .single();

    // Fallback to trading_sessions
    if (strategyError) {
      const { data: fallbackStrategy, error: fallbackError } = await supabase
        .from("trading_sessions")
        .insert({
          user_id: userId,
          mode,
          status: "active",
          strategy_id: strategyType,
          initial_capital: initialCapital,
          current_capital: initialCapital,
          total_trades: 0,
          winning_trades: 0,
          total_pnl: 0,
          trading_pair: tradingPair,
          started_at: new Date().toISOString(),
          strategy_config: {
            ...strategyConfig,
            source: "marketplace",
            listing_id: listingId,
            seller_id: listing.seller_id,
          },
        })
        .select()
        .single();

      if (fallbackError) {
        console.error("Failed to create strategy:", fallbackError);
        return NextResponse.json(
          { error: "Failed to create strategy from listing" },
          { status: 500 },
        );
      }

      // Create marketplace subscription record
      const { data: subscription, error: subError } = await supabase
        .from("marketplace_subscriptions")
        .insert({
          subscriber_id: userId,
          listing_id: listingId,
          user_strategy_id: fallbackStrategy.id,
          status: "active",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (subError) {
        console.error("Failed to create subscription:", subError);
      }

      // Increment subscriber count on listing
      await supabase.rpc("increment_subscriber_count", {
        listing_id: listingId,
      });

      return NextResponse.json({
        subscriptionId: subscription?.id || fallbackStrategy.id,
        userStrategyId: fallbackStrategy.id,
        message: "Successfully subscribed to strategy",
      });
    }

    // Create marketplace subscription record
    const { data: subscription, error: subError } = await supabase
      .from("marketplace_subscriptions")
      .insert({
        subscriber_id: userId,
        listing_id: listingId,
        user_strategy_id: userStrategy.id,
        status: "active",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (subError) {
      console.error("Failed to create subscription:", subError);
    }

    // Increment subscriber count on listing
    await supabase
      .from("marketplace_listings")
      .update({
        subscriber_count: (listing.subscriber_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId);

    return NextResponse.json({
      subscriptionId: subscription?.id || userStrategy.id,
      userStrategyId: userStrategy.id,
      message: "Successfully subscribed to strategy",
    });
  } catch (error) {
    console.error("Error in /api/marketplace/subscribe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
