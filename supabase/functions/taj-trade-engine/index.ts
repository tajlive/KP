import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Constants
const BINANCE_API_URL = "https://api.binance.com/api/v3";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface MarketData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

serve(async (req: Request) => {
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // Read expected token from environment (set TAJ_CRON_TOKEN in Dashboard Secrets)
  const expectedToken = Deno.env.get("TAJ_CRON_TOKEN") || "";

  // Read Authorization header (case-insensitive)
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization") || "";

  // Expected format: "Bearer <token>"
  const expectedHeader = `Bearer ${expectedToken}`;

  if (!expectedToken) {
    // Security misconfiguration: no token set
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
        received: authHeader || null,
        expected_prefix: `Bearer ${expectedToken.substring(0, 10)}...`,
      }),
      {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  try {
    // --- MAIN TRADE ENGINE LOGIC START ---

    // 1. Initialize Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", // Use Service Role for Cron Jobs
    );

    interface AutoTradingConfig {
      user_id: string;
      custom_params: any;
      user: { email: string };
    }

    const { data: configs, error: configError } = (await supabaseClient
      .from("user_auto_trading_configs")
      .select(`*, user:user_id(email)`)
      .eq("is_enabled", true)) as {
      data: AutoTradingConfig[] | null;
      error: any;
    };

    if (configError) throw configError;
    if (!configs)
      return new Response(
        JSON.stringify({ status: "ok", message: "No active configs" }),
        { headers: CORS_HEADERS },
      );

    const results: any[] = [];

    for (const config of configs) {
      // Only process Taj for now (safety)
      if (config.user?.email !== "tomarnejensen@gmail.com") continue;

      const customParams = config.custom_params || {};
      const markets = ["BTCUSDT", "ETHUSDT"];

      for (const symbol of markets) {
        // 3. Fetch Market Data (Binance)
        const candles = await fetchBinanceCandles(symbol, "1h", 100);
        if (!candles.length) continue;

        // 4. Calculate Indicators
        const closes = candles.map((c) => c.close);
        const ma12 = calculateSMA(closes, 12);
        // ma26 unused but kept for parity
        const ma50 = calculateSMA(closes, 50);
        const rsi = calculateRSI(closes, 14);

        const currentPrice = closes[closes.length - 1];

        // 5. Strategy Logic
        // Buy Trigger: Price > MA50 AND RSI > 50 AND RSI < 70
        const rsiBuyMin = 50;
        const rsiBuyMax = 70;

        const signal =
          currentPrice > ma50 && rsi > rsiBuyMin && rsi < rsiBuyMax;

        // Check if already open position
        const { data: openTrades } = await supabaseClient
          .from("auto_trading_trades")
          .select("*")
          .eq("user_id", config.user_id)
          .eq("symbol", symbol)
          .eq("status", "OPEN");

        const hasOpenPosition = openTrades && openTrades.length > 0;

        if (signal && !hasOpenPosition) {
          // 6. EXECUTE BUY
          const amountNOK = customParams.order_amount_nok || 40;
          const quantity = amountNOK / 11 / currentPrice; // Approx rate

          const { data: trade } = await supabaseClient
            .from("auto_trading_trades")
            .insert({
              session_id: "00000000-0000-0000-0000-000000000000",
              user_id: config.user_id,
              symbol: symbol,
              side: "LONG",
              entry_price: currentPrice,
              quantity: quantity,
              position_value_nok: amountNOK,
              status: "OPEN",
            })
            .select()
            .single();

          results.push({
            symbol,
            action: "BUY",
            price: currentPrice,
            rsi,
            tradeId: trade?.id,
            note: "Executed via Secure Cron",
          });
        } else {
          results.push({
            symbol,
            action: "WAIT",
            price: currentPrice,
            rsi,
            signal,
            hasOpenPosition,
            note: signal ? "Signal active but position overlap" : "No signal",
          });
        }
      }
    }

    // --- MAIN TRADE ENGINE LOGIC END ---

    // Example response payload
    const payload = {
      status: "ok",
      job: "taj-trade-engine",
      version: "1.0",
      executed_at: new Date().toISOString(),
      results: results,
    };

    // Return success
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    // Catch and return errors for easier debugging
    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: String(err),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
});

// Helpers
async function fetchBinanceCandles(
  symbol: string,
  interval: string,
  limit: number,
): Promise<MarketData[]> {
  try {
    const res = await fetch(
      `${BINANCE_API_URL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    );
    const data = await res.json();
    return data.map((d: any) => ({
      time: d[0],
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5]),
    }));
  } catch (e) {
    console.error("Binance Fetch Error", e);
    return [];
  }
}

function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return 0;
  const slice = data.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

function calculateRSI(data: number[], period: number): number {
  if (data.length < period + 1) return 0;
  let gains = 0;
  let losses = 0;
  // First RSI
  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  // Subsequent
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
