/**
 * API v1: Trading Consolidated Endpoint
 * 
 * Consolidates trading APIs under /api/v1/trading/[action]
 * Supports both live and paper trading via mode query param
 * 
 * This is a PROXY route that delegates to existing handlers:
 * - execute -> calls existing executePaperTrade / executeLiveTrade functions
 * - Other actions -> delegates to existing API routes or safety layer functions
 */

import {
  executePaperTrade,
  executeLiveTrade,
  type PaperTradeRequest,
  type LiveTradeRequest,
} from "@/lib/trading/safety";
import { getUsdtToNokRateAsync } from "@/lib/trading/currency";
import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const TRADING_ACTIONS = [
  "execute",
  "trigger",
  "order",
  "depth",
  "price",
  "mode",
  "sessions"
] as const;

type TradingAction = (typeof TRADING_ACTIONS)[number];

function isValidAction(action: string): action is TradingAction {
  return TRADING_ACTIONS.includes(action as TradingAction);
}

// Validation schemas matching existing routes
const executeSchema = z.object({
  session_id: z.string().uuid().optional(),
  symbol: z.string().min(1),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  order_type: z.enum(["market", "limit"]).default("market"),
  bot_id: z.string().uuid().optional(),
  // Alternative input format (from paper-trading UI)
  pair: z.string().min(1).max(20).optional(),
  amount_nok: z.number().positive().optional(),
});

const triggerSchema = z.object({
  symbol: z.string().min(1),
  trigger_price: z.number().positive(),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
  action: z.enum(["entry", "exit", "stop_loss", "take_profit"]),
});

const orderSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
  price: z.number().positive(),
  type: z.enum(["limit", "market"]).default("limit"),
  time_in_force: z.enum(["GTC", "IOC", "FOK"]).default("GTC"),
});

const modeSchema = z.object({
  mode: z.enum(["live", "paper"]),
});

const sessionSchema = z.object({
  name: z.string().optional(),
  initial_balance: z.number().positive().default(100000),
  strategy_id: z.string().optional(),
  trading_pair: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    
    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: "Unknown action", validActions: TRADING_ACTIONS },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const mode = (searchParams.get("mode") as "live" | "paper") || "paper";

    // Delegate to appropriate handler
    switch (action) {
      case "execute":
        return handleExecute(request, mode);
      case "trigger":
        return handleTrigger(request, mode);
      case "order":
        return handleOrder(request, mode);
      case "mode":
        return handleSetMode(request);
      case "sessions":
        return handleCreateSession(request, mode);
      default:
        return NextResponse.json(
          { error: "Action not supported for POST" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/trading/POST]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    
    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: "Unknown action", validActions: TRADING_ACTIONS },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const mode = (searchParams.get("mode") as "live" | "paper") || "paper";

    switch (action) {
      case "depth":
        return handleDepth(request, searchParams);
      case "price":
        return handlePrice(request, searchParams);
      case "mode":
        return handleGetMode(request);
      case "sessions":
        return handleGetSessions(mode, request);
      default:
        return NextResponse.json(
          { error: "Action not supported for GET" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/trading/GET]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// Handlers - Delegate to existing safety layer functions
// ============================================================================

/**
 * Handle trade execution - delegates to executePaperTrade or executeLiveTrade
 * Matches patterns from /api/trading/execute and /api/paper-trading/execute
 */
async function handleExecute(
  request: NextRequest,
  mode: "live" | "paper"
) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body with error handling
  const rawBody = await request.text();
  if (!rawBody) {
    return NextResponse.json(
      { error: "Invalid request", details: { formErrors: ["Empty body"] } },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json(
      { error: "Invalid request", details: { formErrors: ["Invalid JSON"] } },
      { status: 400 },
    );
  }

  const validation = executeSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid trade data", details: validation.error.format() },
      { status: 400 },
    );
  }

  const data = validation.data;

  try {
    if (mode === "paper") {
      // Handle paper trading - supports both formats (amount_nok or quantity/price)
      let symbol: string;
      let quantity: number;
      let price: number;

      if (data.amount_nok && data.pair) {
        // Format: { pair, side, amount_nok }
        symbol = data.pair.toUpperCase().replace("/", "");
        
        // Fetch price from Binance
        const priceRes = await fetch(
          `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
          { signal: AbortSignal.timeout(5000) }
        );
        
        if (!priceRes.ok) {
          return NextResponse.json(
            { error: "Could not fetch price for " + symbol },
            { status: 502 }
          );
        }

        const priceData = await priceRes.json();
        const fetchedPrice = parseFloat(priceData?.price);
        if (!Number.isFinite(fetchedPrice) || fetchedPrice <= 0) {
          return NextResponse.json(
            { error: "Invalid price for " + symbol },
            { status: 502 }
          );
        }

        // Use the currency utility to get USDT/NOK rate
        const rate = await getUsdtToNokRateAsync(supabase);
        const amountUsdt = data.amount_nok / rate;
        quantity = amountUsdt / fetchedPrice;
        price = fetchedPrice;

        if (quantity <= 0 || !Number.isFinite(quantity)) {
          return NextResponse.json(
            { error: "Invalid amount or quantity" },
            { status: 400 }
          );
        }
      } else if (data.quantity && data.symbol) {
        // Format: { symbol, side, quantity, price }
        symbol = data.symbol.toUpperCase();
        quantity = data.quantity;
        price = data.price || await fetchQuickPrice(symbol);
      } else {
        return NextResponse.json(
          { error: "Missing required fields: provide either (pair, amount_nok) or (symbol, quantity)" },
          { status: 400 }
        );
      }

      const paperRequest: PaperTradeRequest = {
        userId: user.id,
        symbol,
        side: data.side,
        quantity,
        price,
        orderType: data.order_type || "market",
        botId: data.bot_id,
        sessionId: data.session_id,
      };

      const result = await executePaperTrade(paperRequest);

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error,
          rejectionReason: result.rejectionReason,
          type: "TRADE_REJECTED",
        }, { status: 200 });
      }

      return NextResponse.json({
        success: true,
        trade_id: result.tradeId,
        session_id: result.sessionId,
        new_balance: result.newBalance ?? 0,
        mode: "paper",
      });
    } else {
      // Handle live trading
      if (!data.session_id) {
        return NextResponse.json(
          { error: "Missing required field: session_id for live trading" },
          { status: 400 }
        );
      }

      const liveRequest: LiveTradeRequest = {
        userId: user.id,
        sessionId: data.session_id,
        symbol: data.symbol.toUpperCase(),
        side: data.side,
        quantity: data.quantity,
        price: data.price,
        orderType: data.order_type || "market",
        botId: data.bot_id,
      };

      const result = await executeLiveTrade(liveRequest);

      if (!result.success) {
        if (result.rejectionReason) {
          return NextResponse.json({
            success: false,
            error: result.error,
            rejectionReason: result.rejectionReason,
            type: "TRADE_REJECTED",
          }, { status: 200 });
        }

        return NextResponse.json(
          { error: result.error || "Live execution failed" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        trade: {
          tradeId: result.tradeId,
          orderId: result.orderId,
          symbol: data.symbol.toUpperCase(),
          side: data.side,
          executedQuantity: result.executedQuantity,
          executedPrice: result.executedPrice,
          fee: result.fee,
        },
        mode: "live",
      });
    }
  } catch (error) {
    console.error("[v1/trading/execute]", error);
    return NextResponse.json(
      { error: "Trade execution failed", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Handle trigger creation
 * NOTE: trading_triggers table doesn't exist in schema - using type assertion
 */
async function handleTrigger(
  request: NextRequest,
  mode: "live" | "paper"
) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  if (!rawBody) {
    return NextResponse.json(
      { error: "Invalid request", details: { formErrors: ["Empty body"] } },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json(
      { error: "Invalid request", details: { formErrors: ["Invalid JSON"] } },
      { status: 400 },
    );
  }

  const validation = triggerSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid trigger data", details: validation.error.format() },
      { status: 400 }
    );
  }

  const { symbol, trigger_price, side, quantity, action } = validation.data;

  // Use type assertion since trading_triggers table is not in generated types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: trigger, error } = await (supabase as any)
    .from("trading_triggers")
    .insert({
      user_id: user.id,
      symbol: symbol.toUpperCase(),
      trigger_price,
      side: side.toUpperCase(),
      quantity,
      action,
      mode,
      status: "ACTIVE",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[v1/trading/trigger]", error);
    return NextResponse.json(
      { error: "Trigger creation failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    trigger,
    mode,
  });
}

/**
 * Handle order creation
 * NOTE: The orders table in schema is for subscription orders, not trading orders
 * Using trades table instead for trading orders
 */
async function handleOrder(
  request: NextRequest,
  mode: "live" | "paper"
) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  if (!rawBody) {
    return NextResponse.json(
      { error: "Invalid request", details: { formErrors: ["Empty body"] } },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json(
      { error: "Invalid request", details: { formErrors: ["Invalid JSON"] } },
      { status: 400 },
    );
  }

  const validation = orderSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid order data", details: validation.error.format() },
      { status: 400 }
    );
  }

  const { symbol, side, quantity, price, type } = validation.data;

  // Get or create a trading session (trades table requires session_id)
  const { data: session } = await supabase
    .from("trading_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("mode", mode)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let sessionId = session?.id;
  
  // Create a session if none exists
  if (!sessionId) {
    const now = new Date().toISOString();
    const { data: newSession, error: sessionError } = await supabase
      .from("trading_sessions")
      .insert({
        user_id: user.id,
        mode,
        status: "active",
        strategy_id: "manual",
        strategy_config: {},
        trading_pair: symbol.toUpperCase(),
        starting_capital_nok: 100000,
        current_capital_nok: 100000,
        initial_capital: 100000,
        current_capital: 100000,
        total_pnl: 0,
        winning_trades: 0,
        losing_trades: 0,
        total_trades: 0,
        started_at: now,
        last_heartbeat: now,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();
    
    if (sessionError || !newSession) {
      return NextResponse.json(
        { error: "Could not create trading session" },
        { status: 500 }
      );
    }
    sessionId = newSession.id;
  }

  // Insert into trades table (requires session_id and total_value)
  const { data: order, error } = await supabase
    .from("trades")
    .insert({
      user_id: user.id,
      session_id: sessionId,
      trading_pair: symbol.toUpperCase(),
      side: side.toLowerCase(),
      quantity,
      price,
      total_value: quantity * price,
      order_type: type,
      mode,
      status: "open",
      fee: 0,
      created_at: new Date().toISOString(),
      // idempotency_key is required per schema
      idempotency_key: `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    })
    .select()
    .single();

  if (error) {
    console.error("[v1/trading/order]", error);
    return NextResponse.json(
      { error: "Order creation failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    order,
    mode,
  });
}

/**
 * Get order book depth - delegates to existing market API
 */
async function handleDepth(
  request: NextRequest,
  searchParams: URLSearchParams
) {
  const symbol = searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol required" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${request.nextUrl.origin}/api/market/binance-depth?symbol=${symbol.toUpperCase()}`,
      { cache: "no-store" }
    );
    
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch depth" },
        { status: 502 }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[v1/trading/depth]", error);
    return NextResponse.json(
      { error: "Depth fetch failed" },
      { status: 500 }
    );
  }
}

/**
 * Get price - delegates to existing market API
 */
async function handlePrice(
  request: NextRequest,
  searchParams: URLSearchParams
) {
  const symbol = searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol required" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${request.nextUrl.origin}/api/market/binance-prices?symbols=${symbol.toUpperCase()}`,
      { cache: "no-store" }
    );
    
    if (!response.ok) {
      return NextResponse.json(
        { error: "Price fetch failed" },
        { status: 502 }
      );
    }
    
    const data = await response.json();
    const symbolData = data[symbol.toUpperCase()] || data[0];
    
    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      price: symbolData?.price || 0,
      change24h: symbolData?.change24h || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[v1/trading/price]", error);
    return NextResponse.json(
      { error: "Price fetch failed" },
      { status: 500 }
    );
  }
}

/**
 * Get user trading mode preference
 * NOTE: user_preferences table doesn't exist in schema - using user_profiles with type assertion
 */
async function handleGetMode(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Use type assertion since user_preferences is not in generated types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: preference, error } = await (supabase as any)
      .from("user_preferences")
      .select("trading_mode")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    const mode = preference?.trading_mode || "paper";
    return NextResponse.json({ mode, userId: user.id });
  } catch (error) {
    console.error("[v1/trading/mode/GET]", error);
    return NextResponse.json({ mode: "paper", userId: user.id });
  }
}

/**
 * Set user trading mode preference
 * NOTE: user_preferences table doesn't exist in schema - using type assertion
 */
async function handleSetMode(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  if (!rawBody) {
    return NextResponse.json(
      { error: "Invalid request", details: { formErrors: ["Empty body"] } },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json(
      { error: "Invalid request", details: { formErrors: ["Invalid JSON"] } },
      { status: 400 },
    );
  }

  const validation = modeSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid mode data", details: validation.error.format() },
      { status: 400 }
    );
  }

  const { mode } = validation.data;

  try {
    // Use type assertion since user_preferences is not in generated types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("user_preferences")
      .upsert({
        user_id: user.id,
        trading_mode: mode,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) throw error;

    return NextResponse.json({ mode, success: true });
  } catch (error) {
    console.error("[v1/trading/mode/POST]", error);
    return NextResponse.json(
      { error: "Mode update failed" },
      { status: 500 }
    );
  }
}

/**
 * Get trading sessions
 */
async function handleGetSessions(
  mode: "live" | "paper",
  request: NextRequest
) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: sessions, error } = await supabase
      .from("trading_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("mode", mode)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ sessions: sessions || [], mode });
  } catch (error) {
    console.error("[v1/trading/sessions/GET]", error);
    return NextResponse.json({ sessions: [], mode });
  }
}

/**
 * Create trading session
 */
async function handleCreateSession(
  request: NextRequest,
  mode: "live" | "paper"
) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  if (!rawBody) {
    return NextResponse.json(
      { error: "Invalid request", details: { formErrors: ["Empty body"] } },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json(
      { error: "Invalid request", details: { formErrors: ["Invalid JSON"] } },
      { status: 400 },
    );
  }

  const validation = sessionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid session data", details: validation.error.format() },
      { status: 400 }
    );
  }

  const { name, initial_balance, strategy_id, trading_pair } = validation.data;
  const now = new Date().toISOString();

  try {
    const { data: session, error } = await supabase
      .from("trading_sessions")
      .insert({
        user_id: user.id,
        name: name || `${mode.toUpperCase()} Session`,
        mode,
        initial_capital: initial_balance,
        current_capital: initial_balance,
        starting_capital_nok: initial_balance,
        current_capital_nok: initial_balance,
        status: "active",
        strategy_id: strategy_id || "dca",
        strategy_config: {},
        trading_pair: trading_pair || "BTCUSDT",
        total_pnl: 0,
        winning_trades: 0,
        losing_trades: 0,
        total_trades: 0,
        started_at: now,
        last_heartbeat: now,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ session, mode, success: true });
  } catch (error) {
    console.error("[v1/trading/sessions/POST]", error);
    return NextResponse.json(
      { error: "Session creation failed" },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Fetch quick price from Binance for validation
 */
async function fetchQuickPrice(symbol: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return parseFloat(data.price);
  } catch {
    return 0;
  }
}
