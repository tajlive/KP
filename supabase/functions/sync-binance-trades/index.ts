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
        const { error: insertError } = await supabase
          .from("auto_trades")
          .upsert(
            {
              user_id: userId,
              binance_trade_id: trade.id.toString(),
              binance_order_id: trade.orderId.toString(),
              symbol: trade.symbol,
              side: trade.isBuyer ? "buy" : "sell",
              quantity: parseFloat(trade.qty),
              quantity_nok: parseFloat(trade.quoteQty),
              price_per_unit: parseFloat(trade.price),
              current_price: parseFloat(trade.price),
              status: "closed", // Binance myTrades returns completed trades
              executed_at: new Date(trade.time).toISOString(),
              pnl_nok: 0, // Will calculate from fee
              pnl_percent: 0,
            },
            {
              onConflict: "binance_trade_id",
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
      .from("auto_trades")
      .select("*")
      .eq("user_id", userId);

    if (allTrades) {
      const openTrades = allTrades.filter((t: any) => t.status === "open");
      const closedTrades = allTrades.filter((t: any) => t.status === "closed");

      const totalValue = openTrades.reduce(
        (sum: number, t: any) => sum + (t.quantity * (t.current_price || 0)),
        0
      );
      const closedProfit = closedTrades.reduce(
        (sum: number, t: any) => sum + (t.pnl_nok || 0),
        0
      );
      const openProfit = openTrades.reduce(
        (sum: number, t: any) => sum + (t.pnl_nok || 0),
        0
      );
      const totalProfit = closedProfit + openProfit;
      const totalProfitPercent =
        allTrades.length > 0
          ? ((totalProfit / (allTrades[0].quantity_nok * allTrades.length)) * 100).toFixed(2)
          : 0;

      const winRate =
        closedTrades.length > 0
          ? (closedTrades.filter((t: any) => t.pnl_nok > 0).length /
              closedTrades.length) *
            100
          : 0;

      // Update portfolio summary
      await supabase.from("portfolio_summary").upsert(
        {
          user_id: userId,
          total_value_nok: totalValue,
          total_profit_nok: totalProfit,
          total_profit_percent: parseFloat(totalProfitPercent as any),
          total_trades: allTrades.length,
          open_trades: openTrades.length,
          closed_trades: closedTrades.length,
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
