import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BINANCE_API_URL = "https://api.binance.com/api/v3";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // 1. Validate Secure Token (TAJ_CRON_TOKEN)
  const expectedToken = Deno.env.get("TAJ_CRON_TOKEN") || "";
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const expectedHeader = `Bearer ${expectedToken}`;

  if (!expectedToken) {
    return new Response(
      JSON.stringify({
        error: "Server misconfiguration: TAJ_CRON_TOKEN not set",
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  if (authHeader !== expectedHeader) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        expected_prefix: `Bearer ${expectedToken.substring(0, 10)}...`,
      }),
      {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", // Service Role for Cron Ops
    );

    interface Trade {
      id: string;
      user_id: string;
      symbol: string;
      entry_price: number;
      opened_at: string;
    }

    const { data: trades, error: tradesError } = (await supabaseClient
      .from("auto_trading_trades")
      .select(`id, user_id, symbol, entry_price, opened_at`)
      .eq("status", "OPEN")) as { data: Trade[] | null; error: any };

    if (tradesError) throw tradesError;
    if (!trades)
      return new Response(
        JSON.stringify({ status: "ok", message: "No open trades" }),
        { headers: CORS_HEADERS },
      );

    const results: any[] = [];
    const symbols = Array.from(new Set(trades.map((t: Trade) => t.symbol)));
    const prices: Record<string, number> = {};

    for (const symbol of symbols) {
      const price = await fetchCurrentPrice(symbol);
      if (price) prices[symbol] = price;
    }

    // 3. Process exits
    for (const trade of trades) {
      const currentPrice = prices[trade.symbol];
      if (!currentPrice) continue;

      const { data: config } = await supabaseClient
        .from("user_auto_trading_configs")
        .select("custom_params")
        .eq("user_id", trade.user_id)
        .single();

      const params = config?.custom_params || {};
      const entryPrice = trade.entry_price;
      const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;

      // Default Params
      const stopLossPct = params.stop_loss_pct || 4.0;
      const maxTimeHours = 24;

      let action = "HOLD";
      let reason = "";

      // Logic 1: Hard Stop Loss
      if (pnlPct <= -stopLossPct) {
        action = "CLOSE";
        reason = "stop_loss";
      }

      // Logic 2: Time Limit
      const hoursOpen =
        (Date.now() - new Date(trade.opened_at).getTime()) / (1000 * 60 * 60);
      if (hoursOpen >= maxTimeHours) {
        action = "CLOSE";
        reason = "timeout";
      }

      // Logic 3: Take Profit (Simple fixed for now)
      if (pnlPct >= 8.0) {
        action = "CLOSE";
        reason = "take_profit";
      }

      if (action === "CLOSE") {
        await closeTrade(supabaseClient, trade.id, currentPrice, reason);
        results.push({ tradeId: trade.id, action, pnlPct, reason });
      } else {
        results.push({ tradeId: trade.id, action: "HOLD", pnlPct });
      }
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        job: "taj-position-checker",
        executed_at: new Date().toISOString(),
        results,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});

async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`${BINANCE_API_URL}/ticker/price?symbol=${symbol}`);
    const data = await res.json();
    return parseFloat(data.price);
  } catch {
    return null;
  }
}

async function closeTrade(
  supabase: any,
  tradeId: string,
  price: number,
  reason: string,
) {
  await supabase
    .from("auto_trading_trades")
    .update({
      status: "CLOSED",
      exit_price: price,
      closed_at: new Date().toISOString(),
      close_reason: reason,
    })
    .eq("id", tradeId);
}
