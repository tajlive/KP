import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: CORS_HEADERS });

  const expectedToken = Deno.env.get("TAJ_CRON_TOKEN") || "";
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (authHeader !== `Bearer ${expectedToken}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: CORS_HEADERS,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Fetch all Master Trades (OPEN)
    // For this POC, we define "Master" as anyone in the 'strategies' table
    const { data: strategies } = await supabaseClient
      .from("strategies")
      .select("user_id, id");

    if (!strategies || strategies.length === 0) {
      return new Response(
        JSON.stringify({ status: "ok", message: "No master strategies found" }),
        { headers: CORS_HEADERS },
      );
    }

    const masterUserIds = strategies.map((s) => s.user_id);

    const { data: masterTrades } = await supabaseClient
      .from("auto_trading_trades")
      .select("*")
      .in("user_id", masterUserIds)
      .eq("status", "OPEN");

    if (!masterTrades || masterTrades.length === 0) {
      return new Response(
        JSON.stringify({ status: "ok", message: "No master trades to sync" }),
        { headers: CORS_HEADERS },
      );
    }

    const results: any[] = [];

    // 2. For each Master Trade, find its followers
    for (const trade of masterTrades) {
      const strategy = strategies.find((s) => s.user_id === trade.user_id);
      if (!strategy) continue;

      const { data: followers } = await supabaseClient
        .from("strategy_followers")
        .select("follower_user_id, allocation_percent")
        .eq("strategy_id", strategy.id)
        .eq("is_active", true);

      if (!followers) continue;

      for (const follower of followers) {
        // 3. Check if follower already has this trade open
        const { data: existing } = await supabaseClient
          .from("auto_trading_trades")
          .select("id")
          .eq("user_id", follower.follower_user_id)
          .eq("symbol", trade.symbol)
          .eq("status", "OPEN")
          .single();

        if (!existing) {
          // 4. Copy Trade
          const quantity =
            (trade.quantity * (follower.allocation_percent || 100)) / 100;

          await supabaseClient.from("auto_trading_trades").insert({
            user_id: follower.follower_user_id,
            symbol: trade.symbol,
            side: trade.side,
            entry_price: trade.entry_price,
            quantity: quantity,
            status: "OPEN",
            copied_from_trade_id: trade.id, // We should ensure this column exists later
          });

          results.push({
            follower: follower.follower_user_id,
            symbol: trade.symbol,
            master_trade_id: trade.id,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        synced: results.length,
        details: results,
      }),
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
});
