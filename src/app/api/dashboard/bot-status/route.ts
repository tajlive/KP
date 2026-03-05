// ============================================================================
// GET /api/dashboard/bot-status
// KLA-100: Returns real-time bot status for the dashboard
// ============================================================================

import { CACHE_TTL, withCache } from "@/lib/cache";
import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface BotStatusResponse {
  activeStrategy: {
    id: string;
    name: string;
    type: "dca" | "trend" | "multisignal" | "grid" | "aicopy";
    mode: "paper" | "live";
    status: "active" | "paused" | "stopped";
    lastAnalysisDetails: Record<string, unknown> | null;
    lastAction: {
      side: "buy" | "sell";
      price: number;
      at: string;
      reason: string;
    } | null;
    nextActionAt: string | null;
    nextActionDescription: string | null;
  } | null;
  pnl: {
    today: number;
    week: number;
    month: number;
  };
  lastTrades: Array<{
    id: string;
    side: "buy" | "sell";
    symbol: string;
    price: number;
    quantity: number;
    executedAt: string;
    explanation: string;
  }>;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<BotStatusResponse | { error: string }>> {
  try {
    // Create response object for cookie handling
    const response = NextResponse.next();

    // Create authenticated Supabase client
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
    const cacheKey = `bot-status:${userId}`;

    const botStatusResponse = await withCache(
      cacheKey,
      async () => {
        // Calculate P&L for different time periods
        const now = new Date();
        const startOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Parallelize fetching strategy and trades to avoid N+1 and reduce latency
        const [strategyResult, lastTradesResult, pnlResult] = await Promise.all(
          [
            supabase
              .from("user_strategies")
              .select("*")
              .eq("user_id", userId)
              .eq("status", "active")
              .order("created_at", { ascending: false })
              .limit(1)
              .single(),
            supabase
              .from("trades")
              .select("*")
              .eq("user_id", userId)
              .order("executed_at", { ascending: false })
              .limit(5),
            supabase
              .from("trades")
              .select("realized_pnl, executed_at")
              .eq("user_id", userId)
              .gte("executed_at", startOfMonth.toISOString())
              .not("realized_pnl", "is", null),
          ],
        );

        let activeStrategy = strategyResult.data;
        let strategyError = strategyResult.error;

        // Fallback to trading_sessions if user_strategies returns no data
        if (!activeStrategy) {
          const fallbackResult = await supabase
            .from("trading_sessions")
            .select("*")
            .eq("user_id", userId)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (fallbackResult.data) {
            activeStrategy = fallbackResult.data;
            strategyError = null;
          }
        }

        const lastTradesData = lastTradesResult.data;
        const pnlData = pnlResult.data;

        // Calculate P&L aggregates
        let pnlToday = 0;
        let pnlWeek = 0;
        let pnlMonth = 0;

        if (pnlData) {
          for (const trade of pnlData) {
            const pnl = trade.realized_pnl || 0;
            const executedAt = new Date(trade.executed_at);

            if (executedAt >= startOfToday) {
              pnlToday += pnl;
            }
            if (executedAt >= startOfWeek) {
              pnlWeek += pnl;
            }
            pnlMonth += pnl;
          }
        }

        // Get the most recent trade for last action info
        const lastTrade = lastTradesData?.[0];

        // Map strategy type to simplified type
        const mapStrategyType = (
          strategyId: string,
        ): "dca" | "trend" | "multisignal" | "grid" | "aicopy" => {
          if (strategyId.includes("dca")) return "dca";
          if (strategyId.includes("trend")) return "trend";
          if (strategyId.includes("multi")) return "multisignal";
          if (strategyId.includes("grid")) return "grid";
          return "aicopy";
        };

        // Build response
        return {
          activeStrategy:
            activeStrategy && !strategyError
              ? {
                  id: activeStrategy.id,
                  name: activeStrategy.strategy_id || "Auto Trading",
                  type: mapStrategyType(activeStrategy.strategy_id || ""),
                  mode: activeStrategy.mode || "paper",
                  status: activeStrategy.status || "active",
                  lastAnalysisDetails:
                    activeStrategy.last_analysis_details || null,
                  lastAction: lastTrade
                    ? {
                        side: lastTrade.side as "buy" | "sell",
                        price: lastTrade.price,
                        at: lastTrade.executed_at,
                        reason:
                          lastTrade.strategy_signal?.reason ||
                          (lastTrade.side === "buy"
                            ? "Kjøp basert på signal"
                            : "Salg basert på signal"),
                      }
                    : null,
                  nextActionAt: activeStrategy.next_expected_action_at || null,
                  nextActionDescription:
                    activeStrategy.last_status_message ||
                    "Overvåker markedet for neste signal",
                }
              : null,
          pnl: {
            today: Math.round(pnlToday * 100) / 100,
            week: Math.round(pnlWeek * 100) / 100,
            month: Math.round(pnlMonth * 100) / 100,
          },
          lastTrades:
            lastTradesData?.map((trade: unknown) => ({
              id: trade.id,
              side: trade.side as "buy" | "sell",
              symbol: trade.trading_pair || trade.symbol || "BTC/USDT",
              price: trade.price,
              quantity: trade.quantity,
              executedAt: trade.executed_at,
              explanation:
                trade.strategy_signal?.explanation ||
                (trade.side === "buy" ? "Kjøpssignal" : "Salgsignal"),
            })) || [],
        };
      },
      CACHE_TTL.LEADERBOARD,
    );

    return NextResponse.json(botStatusResponse);
  } catch (error) {
    console.error("Error in /api/dashboard/bot-status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
