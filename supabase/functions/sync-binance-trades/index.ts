import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hmac } from "https://deno.land/std@0.208.0/crypto/mod.ts";

// Encryption helper (reuse from binance-connect)
async function decryptApiKey(encrypted: string, iv: string, secret: string) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("klarpakke-salt-v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const encryptedData = Uint8Array.from(atob(encrypted), (c) =>
    c.charCodeAt(0)
  );
  const ivData = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivData },
    key,
    encryptedData
  );

  return decoder.decode(decrypted);
}

// Binance API client
class BinanceClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = "https://api.binance.com/api/v3";

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  private async request(endpoint: string, params: Record<string, any> = {}) {
    const timestamp = Date.now();
    const queryParams = { ...params, timestamp };

    const queryString = new URLSearchParams(queryParams).toString();
    const signature = await this.sign(queryString);

    const url = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;

    const response = await fetch(url, {
      headers: {
        "X-MBX-APIKEY": this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Binance API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  private async sign(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = encoder.encode(this.apiSecret);
    const message = encoder.encode(data);

    const signature = await crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), message);
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async getTrades(symbol: string = "BTCUSDT", limit: number = 500) {
    return this.request("/myTrades", { symbol, limit });
  }

  async getAccount() {
    return this.request("/account");
  }

  async getBalance(asset: string) {
    const account = await this.getAccount();
    return account.balances.find(
      (b: any) => b.asset.toUpperCase() === asset.toUpperCase()
    );
  }
}

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Find or create active live trading session for this user
    const { data: liveSession, error: sessionError } = await supabase
      .from("trading_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("mode", "live")
      .eq("status", "active")
      .single();

    if (sessionError || !liveSession) {
      return new Response(
        JSON.stringify({ error: "No active live trading session found. Please start live trading first." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const sessionId = liveSession.id;

    // Log sync start
    const { data: syncLog } = await supabase
      .from("trade_sync_log")
      .insert({
        user_id: userId,
        status: "in_progress",
        message: "Starting Binance trade sync",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    // Get encrypted API keys
    const { data: apiKeys, error: keysError } = await supabase
      .from("trading_api_keys")
      .select("*")
      .eq("user_id", userId)
      .eq("exchange", "binance")
      .single();

    if (keysError || !apiKeys) {
      const errorMsg = "No Binance API keys found";
      await updateSyncLog(supabase, syncLog?.id, "error", errorMsg);
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Decrypt API keys
    const encryptionSecret =
      Deno.env.get("ENCRYPTION_SECRET") || "klarpakke-secret-key";

    const decryptedKey = await decryptApiKey(
      apiKeys.api_key_encrypted,
      apiKeys.api_key_iv,
      encryptionSecret
    );
    const decryptedSecret = await decryptApiKey(
      apiKeys.api_secret_encrypted,
      apiKeys.api_secret_iv,
      encryptionSecret
    );

    // Create Binance client
    const binanceClient = new BinanceClient(decryptedKey, decryptedSecret);

    // Fetch trades from Binance (fetch all since we don't have pagination)
    const binanceTrades = await binanceClient.getTrades();

    // Save trades to database
    let tradesAdded = 0;
    let tradesFailed = 0;

    for (const trade of binanceTrades) {
      try {
        const totalValue = parseFloat(trade.quoteQty);
        const { error: insertError } = await supabase
          .from("trades")
          .upsert(
            {
              session_id: sessionId,
              user_id: userId,
              mode: "live",
              trading_pair: trade.symbol,
              side: trade.isBuyer ? "buy" : "sell",
              order_type: "market",
              quantity: parseFloat(trade.qty),
              price: parseFloat(trade.price),
              total_value: totalValue,
              fee: totalValue * 0.001, // 0.1% Binance fee
              status: "filled",
              binance_order_id: trade.orderId.toString(),
              idempotency_key: `binance-${trade.id.toString()}`,
              executed_at: new Date(trade.time).toISOString(),
            },
            {
              onConflict: "idempotency_key",
            }
          );

        if (insertError) {
          console.error("Failed to insert trade:", insertError);
          tradesFailed++;
        } else {
          tradesAdded++;
        }
      } catch (error) {
        console.error("Trade processing error:", error);
        tradesFailed++;
      }
    }

    // Calculate portfolio summary
    const { data: allTrades } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .eq("mode", "live");

    if (allTrades) {
      const totalValue = allTrades.reduce(
        (sum: number, t: any) => sum + (parseFloat(t.total_value) || 0),
        0
      );
      const totalFee = allTrades.reduce(
        (sum: number, t: any) => sum + (parseFloat(t.fee) || 0),
        0
      );
      const realizedPnl = allTrades.reduce(
        (sum: number, t: any) => sum + (parseFloat(t.realized_pnl) || 0),
        0
      );

      // Calculate win rate from trades with realized_pnl (set by DB trigger for sell trades)
      const sellTrades = allTrades.filter((t: any) => t.side === 'sell' && t.realized_pnl !== null);
      const winRate = sellTrades.length > 0
        ? Math.round((sellTrades.filter((t: any) => parseFloat(t.realized_pnl) > 0).length / sellTrades.length) * 100)
        : 0;

      // Update portfolio summary
      await supabase.from("portfolio_summary").upsert(
        {
          user_id: userId,
          total_value_nok: totalValue,
          total_profit_nok: realizedPnl,
          total_profit_percent: 0,
          total_trades: allTrades.length,
          open_trades: 0,
          closed_trades: allTrades.length,
          win_rate: winRate,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );
    }

    // Update sync log - success
    await updateSyncLog(
      supabase,
      syncLog?.id,
      "success",
      `Synced ${tradesAdded} trades, ${tradesFailed} failed`,
      binanceTrades.length,
      tradesAdded
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${tradesAdded} trades`,
        trades_synced: tradesAdded,
        trades_failed: tradesFailed,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
});

async function updateSyncLog(
  supabase: any,
  logId: string | undefined,
  status: string,
  message: string,
  tradesFetched: number = 0,
  tradesSaved: number = 0
) {
  if (!logId) return;

  await supabase
    .from("trade_sync_log")
    .update({
      status,
      message,
      trades_fetched: tradesFetched,
      trades_saved: tradesSaved,
      completed_at: new Date().toISOString(),
    })
    .eq("id", logId);
}
