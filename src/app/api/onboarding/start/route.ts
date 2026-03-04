// ============================================================================
// POST /api/onboarding/start
// KLA-98: Start the onboarding process for a new user
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OnboardingStartSchema = z.object({
  strategyType: z.enum([
    "dca_trygg",
    "trend_balansert",
    "multisignal_aktiv",
    "grid_bot",
    "ai_copy",
  ]),
  goal: z.string().optional(),
  initialCapital: z.number().min(1000).max(100000).default(10000),
});

export interface OnboardingStartResponse {
  strategyId: string;
  sessionId: string;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<OnboardingStartResponse | { error: string }>> {
  try {
    const response = NextResponse.next();
    const supabase = createServerClient(request, response);

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
    const parsed = OnboardingStartSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { strategyType, goal, initialCapital } = parsed.data;

    // Create user_strategies row with paper mode
    const { data: strategy, error: strategyError } = await supabase
      .from("user_strategies")
      .insert({
        user_id: userId,
        mode: "paper",
        status: "active",
        strategy_type: strategyType,
        strategy_id: strategyType,
        initial_capital: initialCapital,
        current_capital: initialCapital,
        total_trades: 0,
        winning_trades: 0,
        total_pnl: 0,
        trading_pair: "BTC/USDT",
        started_at: new Date().toISOString(),
        strategy_config: {
          isAutoOnboarding: true,
          capital: 1000000,
        },
      })
      .select()
      .single();

    // Fallback to trading_sessions if user_strategies doesn't exist
    if (strategyError) {
      const { data: fallbackStrategy, error: fallbackError } = await supabase
        .from("trading_sessions")
        .insert({
          user_id: userId,
          mode: "paper",
          status: "active",
          strategy_id: strategyType,
          initial_capital: 1000000,
          current_capital: 1000000,
          total_trades: 0,
          winning_trades: 0,
          total_pnl: 0,
          trading_pair: "BTC/USDT",
          started_at: new Date().toISOString(),
          strategy_config: {
            isAutoOnboarding: true,
            capital: 1000000,
          },
        })
        .select()
        .single();

      if (fallbackError) {
        console.error("Failed to create strategy:", fallbackError);
        return NextResponse.json(
          { error: "Failed to create strategy" },
          { status: 500 },
        );
      }

      // Create/upsert onboarding_progress
      await supabase.from("onboarding_progress").upsert(
        {
          user_id: userId,
          current_step: 2,
          goal: goal || "paper_trading",
          selected_strategy_type: strategyType,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      return NextResponse.json({
        strategyId: fallbackStrategy.id,
        sessionId: fallbackStrategy.id,
      });
    }

    // Create/upsert onboarding_progress
    await supabase.from("onboarding_progress").upsert(
      {
        user_id: userId,
        current_step: 2,
        goal: goal || "paper_trading",
        selected_strategy_type: strategyType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    return NextResponse.json({
      strategyId: strategy.id,
      sessionId: strategy.id,
    });
  } catch (error) {
    console.error("Error in /api/onboarding/start:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
