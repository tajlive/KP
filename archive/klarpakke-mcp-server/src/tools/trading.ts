import { getSupabase } from "../clients/supabase.ts";

/**
 * Get a summary of all active trades
 */
export async function getActiveTradesSummary() {
  const supabase = getSupabase();

  // Fetch from user_trades or similar table
  const { data, error } = await supabase
    .from("auto_trading_trades")
    .select("*")
    .eq("status", "open");

  if (error) {
    return {
      content: [
        { type: "text", text: `Error fetching trades: ${error.message}` },
      ],
      isError: true,
    };
  }

  const totalPositions = data?.length || 0;
  const summary = {
    total_positions: totalPositions,
    positions: data || [],
    timestamp: new Date().toISOString(),
  };

  return {
    content: [
      {
        type: "text",
        text: `Found ${totalPositions} active positions.\n${JSON.stringify(summary, null, 2)}`,
      },
    ],
  };
}

/**
 * Update risk parameters for a user or globally
 */
export async function updateRiskParameters(args: {
  level: "low" | "medium" | "high";
  max_leverage: number;
  user_id?: string;
}) {
  const supabase = getSupabase();

  const query = supabase.from("trading_risk_config");

  if (args.user_id) {
    // Update specific user
    const { data: _data, error } = await query
      .update({ risk_level: args.level, max_leverage: args.max_leverage })
      .eq("user_id", args.user_id)
      .select();

    if (error)
      return {
        content: [{ type: "text", text: error.message }],
        isError: true,
      };
    return {
      content: [
        { type: "text", text: `Updated risk for user ${args.user_id}` },
      ],
    };
  } else {
    // Update global defaults (requires admin role)
    const { data: _data, error } = await query
      .update({ risk_level: args.level, max_leverage: args.max_leverage })
      .eq("user_id", "GLOBAL_DEFAULT")
      .select();

    if (error)
      return {
        content: [{ type: "text", text: error.message }],
        isError: true,
      };
    return {
      content: [{ type: "text", text: `Updated global risk parameters` }],
    };
  }
}

/**
 * Emergency: Close all open positions
 * WARNING: Requires direct exchange connectivity logic (Bybit/Binance/etc)
 * For now, this tool marks them as 'closing_requested' in the database
 * which the individual trading bots will pick up and execute.
 */
export async function panicCloseAll(args: {
  reason: string;
  strategy?: string;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from("auto_trading_trades")
    .update({
      status: "closing_requested",
      exit_reason: `PANIC_CLOSE: ${args.reason}`,
    })
    .eq("status", "open");

  if (args.strategy) {
    query = query.eq("strategy_id", args.strategy);
  }

  const { data, error } = await query.select();

  if (error) {
    return {
      content: [
        { type: "text", text: `Emergency close failed: ${error.message}` },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `🚨 Panic close triggered for ${data?.length || 0} positions. Reason: ${args.reason}`,
      },
    ],
  };
}

/**
 * Check Binance account balance for a user
 * WARNING: Requires API keys to be configured in Supabase 'user_exchange_keys'
 */
export async function checkBinanceBalance(args: { user_id: string }) {
  const supabase = getSupabase();

  // In a real implementation, we would fetch the user's encrypted API keys
  // from Supabase and use the Binance SDK to fetch the balance.
  // For now, we return a summary from the database's cached balance if available.
  const { data, error } = await supabase
    .from("user_balances")
    .select("*")
    .eq("user_id", args.user_id)
    .single();

  if (error) {
    return {
      content: [
        { type: "text", text: `Balance fetch failed: ${error.message}` },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `💰 Binance Balance for ${args.user_id}:\n${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

/**
 * Generate a profit report for a specific period
 */
export async function generateProfitReport(args: {
  user_id?: string;
  days?: number;
}) {
  const supabase = getSupabase();
  const days = args.days || 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let query = supabase
    .from("auto_trading_trades")
    .select("*")
    .eq("status", "closed")
    .gte("closed_at", startDate.toISOString());

  if (args.user_id) {
    query = query.eq("user_id", args.user_id);
  }

  const { data, error } = await query;

  if (error) {
    return {
      content: [
        { type: "text", text: `Report generation failed: ${error.message}` },
      ],
      isError: true,
    };
  }

  const totalProfit =
    data?.reduce((sum, t) => sum + (t.profit_amount || 0), 0) || 0;
  const winRate = data?.length
    ? (data.filter((t) => (t.profit_amount || 0) > 0).length / data.length) *
      100
    : 0;

  return {
    content: [
      {
        type: "text",
        text: `📈 Profit Report (Last ${days} days):\n- Total Trades: ${data?.length}\n- Total Profit: $${totalProfit.toFixed(2)}\n- Win Rate: ${winRate.toFixed(1)}%\n\n${JSON.stringify({ trades: data?.slice(0, 5) }, null, 2)}`,
      },
    ],
  };
}
