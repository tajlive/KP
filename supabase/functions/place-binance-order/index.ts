import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Import decrypt function (same as sync-binance-trades)
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

  private async request(endpoint: string, params: Record<string, any> = {}, method = "GET") {
    const timestamp = Date.now();
    const queryParams = { ...params, timestamp };

    const queryString = new URLSearchParams(queryParams).toString();
    const signature = await this.sign(queryString);

    const url = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;

    const response = await fetch(url, {
      method,
      headers: {
        "X-MBX-APIKEY": this.apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.msg || `API error: ${response.status}`);
    }

    return data;
  }

  private async sign(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = encoder.encode(this.apiSecret);
    const message = encoder.encode(data);

    const signature = await crypto.subtle.sign(
      "HMAC",
      await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
      message
    );

    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async placeOrder(
    symbol: string,
    side: "BUY" | "SELL",
    quantity: number,
    orderType: "MARKET" | "LIMIT" = "MARKET",
    price?: number
  ) {
    const params: any = {
      symbol,
      side,
      type: orderType,
      quantity: parseFloat(quantity.toFixed(8)),
    };

    if (orderType === "LIMIT" && price) {
      params.price = parseFloat(price.toFixed(8));
      params.timeInForce = "GTC";
    }

    return this.request("/order", params, "POST");
  }

  async cancelOrder(symbol: string, orderId: number) {
    return this.request("/order", { symbol, orderId }, "DELETE");
  }

  async getOrderStatus(symbol: string, orderId: number) {
    return this.request("/order", { symbol, orderId });
  }
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Parse request
    const body = await req.json();
    const { symbol, side, quantity, order_type, price } = body;

    if (!symbol || !side || !quantity) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: symbol, side, quantity" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!["BUY", "SELL"].includes(side.toUpperCase())) {
      return new Response(
        JSON.stringify({ error: "Invalid side: must be BUY or SELL" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get API keys
    const { data: apiKeys, error: keysError } = await supabase
      .from("trading_api_keys")
      .select("*")
      .eq("user_id", userId)
      .eq("exchange", "binance")
      .single();

    if (keysError || !apiKeys) {
      return new Response(
        JSON.stringify({ error: "No Binance API keys found" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Decrypt keys
    const encryptionSecret = Deno.env.get("ENCRYPTION_SECRET") || "klarpakke-secret-key";
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

    // Place order
    let orderResult;
    try {
      orderResult = await binanceClient.placeOrder(
        symbol,
        side.toUpperCase() as "BUY" | "SELL",
        parseFloat(quantity),
        order_type?.toUpperCase() || "MARKET",
        price ? parseFloat(price) : undefined
      );
    } catch (binanceError: any) {
      // Log failed order attempt
      await supabase.from("api_logs").insert({
        user_id: userId,
        endpoint: "/order",
        method: "POST",
        status_code: 400,
        error_message: binanceError.message,
      });

      return new Response(
        JSON.stringify({ error: binanceError.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Save order to pending_orders
    const { error: saveError } = await supabase.from("pending_orders").insert({
      user_id: userId,
      binance_order_id: orderResult.orderId.toString(),
      symbol: orderResult.symbol,
      side: orderResult.side.toLowerCase(),
      order_type: orderResult.type.toLowerCase(),
      quantity: parseFloat(orderResult.origQty),
      price: parseFloat(orderResult.price) || null,
      status: orderResult.status.toLowerCase(),
      filled_quantity: parseFloat(orderResult.executedQty),
    });

    if (saveError) {
      console.error("Failed to save order:", saveError);
    }

    // Log successful order
    await supabase.from("api_logs").insert({
      user_id: userId,
      endpoint: "/order",
      method: "POST",
      status_code: 200,
    });

    // Create notification
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "order_filled",
      title: `${side.toUpperCase()} Order Placed`,
      message: `${quantity} ${symbol} at market rate`,
      related_id: orderResult.orderId.toString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          orderId: orderResult.orderId,
          symbol: orderResult.symbol,
          side: orderResult.side,
          quantity: orderResult.origQty,
          executedQty: orderResult.executedQty,
          status: orderResult.status,
          timestamp: orderResult.transactTime,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (error) {
    console.error("Order placement error:", error);
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
