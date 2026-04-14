/**
 * Binance API Client for Klarpakke
 *
 * VIKTIG: Dette er den AUTORITATIVE måten å kalle Binance API på.
 * Alle trading-relaterte kall MÅ gå gjennom denne klienten.
 *
 * Sikkerhetsregler:
 * 1. ALLTID sjekk trading_risk_config før trading
 * 2. ALDRI logg API keys
 * 3. Respekter rate limits (max 1200 req/min)
 * 4. Bruk testnet for utvikling
 */

import Binance from "binance-api-node";

/** Binance testnet (dev eller BINANCE_USE_TESTNET) — ikke «use*»-navn (unngår react-hooks/rules-of-hooks i ESLint). */
function isBinanceTestnet(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.BINANCE_USE_TESTNET === "true"
  );
}

// Rate limiter
class RateLimiter {
  private weight = 0;
  private resetTime = Date.now() + 60000;
  private maxWeight = 1200; // Binance limit per minute

  async checkLimit(requestWeight: number = 1): Promise<void> {
    const now = Date.now();

    // Reset counter if window has passed
    if (now > this.resetTime) {
      this.weight = 0;
      this.resetTime = now + 60000;
    }

    // Check if we're approaching limit
    if (this.weight + requestWeight > this.maxWeight) {
      const waitTime = this.resetTime - now;
      console.warn(
        `[Binance] Rate limit approaching. Waiting ${waitTime}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.weight = 0;
      this.resetTime = Date.now() + 60000;
    }

    this.weight += requestWeight;
  }
}

const rateLimiter = new RateLimiter();

// Create client
let client: ReturnType<typeof Binance> | null = null;

type BinanceOrderParams = {
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  quantity: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
};

type BinanceOrderResult = {
  orderId?: number | string;
  status?: string;
};

export function getBinanceClient(): ReturnType<typeof Binance> {
  if (!client) {
    const apiKey = process.env.BINANCE_API_KEY || "";
    const apiSecret = process.env.BINANCE_API_SECRET || "";
    if (!apiKey || !apiSecret) {
      throw new Error(
        "Binance API keys not configured. " +
          "Set BINANCE_API_KEY and BINANCE_API_SECRET in .env.local",
      );
    }

    const testnet = isBinanceTestnet();

    client = Binance({
      apiKey,
      apiSecret,
      ...(testnet && {
        httpBase: "https://testnet.binance.vision",
        httpFutures: "https://testnet.binancefuture.com",
        wsBase: "wss://testnet.binance.vision/ws",
        wsFutures: "wss://stream.binancefuture.com/ws",
      }),
    });

    console.info(
      `[Binance] Client initialized (${testnet ? "TESTNET" : "PRODUCTION"})`,
    );
  }

  return client;
}

/**
 * Hent account info med rate limiting
 */
export async function getAccountInfo() {
  await rateLimiter.checkLimit(10); // Account info has weight 10
  const client = getBinanceClient();
  return client.accountInfo();
}

/**
 * Hent balances for spesifikke coins
 */
export async function getBalances(coins?: string[]) {
  const account = await getAccountInfo();

  if (!coins) {
    return account.balances.filter(
      (b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0,
    );
  }

  return account.balances.filter(
    (b) => coins.includes(b.asset) || coins.includes(b.asset + "USDT"),
  );
}

/**
 * Hent pris for symbol (f.eks. BTCUSDT)
 * Cache resultatet i 5 sekunder for å unngå rate limits
 */
const priceCache = new Map<string, { price: string; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

export async function getPrice(symbol: string): Promise<string | undefined> {
  const cacheKey = symbol.toUpperCase();
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }

  await rateLimiter.checkLimit(2); // Price has weight 2
  const client = getBinanceClient();
  const prices = (await client.prices()) as unknown as Record<string, string>;
  const price = prices[cacheKey];
  priceCache.set(cacheKey, { price, timestamp: Date.now() });
  return price;
}

/**
 * Hent 24h ticker data for et symbol
 */
export async function get24hTicker(symbol: string) {
  await rateLimiter.checkLimit(2);
  const client = getBinanceClient();
  return client.dailyStats({ symbol: symbol.toUpperCase() });
}

/**
 * PLACE ORDER - KUN ETTER RISK VALIDATION
 *
 * VIKTIG: Denne funksjonen skal KUN kalles etter at:
 * 1. trading_risk_config er hentet og validert
 * 2. Position size er beregnet basert på risk level
 * 3. Max leverage er sjekket
 *
 * @see validateRiskConfig i src/lib/trading/risk.ts
 */
export async function placeOrder(params: {
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  quantity: number;
  price?: number; // Kun for LIMIT
  stopPrice?: number; // For STOP_LOSS/TAKE_PROFIT
  timeInForce?: "GTC" | "IOC" | "FOK";
}) {
  // Extra safety: Log all orders
  console.info("[Binance] Placing order:", {
    symbol: params.symbol,
    side: params.side,
    type: params.type,
    quantity: params.quantity,
    timestamp: new Date().toISOString(),
  });

  await rateLimiter.checkLimit(1); // Order placement has weight 1
  const client = getBinanceClient();

  try {
    // Build order parameters
    const orderParams: {
      symbol: string;
      side: "BUY" | "SELL";
      type: "MARKET" | "LIMIT";
      quantity: string;
      price?: string;
      stopPrice?: string;
      timeInForce?: "GTC" | "IOC" | "FOK";
    } = {
      symbol: params.symbol.toUpperCase(),
      side: params.side,
      type: params.type,
      quantity: params.quantity.toString(),
      ...(params.price && { price: params.price.toString() }),
      ...(params.stopPrice && { stopPrice: params.stopPrice.toString() }),
      timeInForce: params.timeInForce || "GTC",
    };

    const orderClient = client as unknown as {
      order: (params: BinanceOrderParams) => Promise<BinanceOrderResult>;
    };
    const order = await orderClient.order(orderParams);

    console.info("[Binance] Order placed successfully:", {
      orderId: order.orderId,
      status: order.status,
    });

    return order;
  } catch (error) {
    console.error("[Binance] Order failed:", error);
    throw error;
  }
}

/**
 * Hent åpne ordrer
 */
export async function getOpenOrders(symbol?: string) {
  await rateLimiter.checkLimit(3); // Open orders has weight 3
  const client = getBinanceClient();
  return client.openOrders({
    ...(symbol && { symbol: symbol.toUpperCase() }),
  });
}

/**
 * Hent order history
 */
export async function getOrderHistory(symbol: string, limit: number = 50) {
  await rateLimiter.checkLimit(10); // All orders has weight 10
  const client = getBinanceClient();
  return client.allOrders({
    symbol: symbol.toUpperCase(),
    limit,
  });
}

/**
 * Kanseller en ordre
 */
export async function cancelOrder(symbol: string, orderId: number) {
  await rateLimiter.checkLimit(1);
  const client = getBinanceClient();
  return client.cancelOrder({
    symbol: symbol.toUpperCase(),
    orderId,
  });
}

// Health check function
export async function checkBinanceConnection(): Promise<{
  connected: boolean;
  testnet: boolean;
  timestamp: string;
  serverTime?: number;
  error?: string;
}> {
  try {
    const client = getBinanceClient();
    const time = await client.time();

    return {
      connected: true,
      testnet: isBinanceTestnet(),
      timestamp: new Date().toISOString(),
      serverTime: (time as { serverTime: number }).serverTime,
    };
  } catch (error) {
    return {
      connected: false,
      testnet: isBinanceTestnet(),
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Reset client (useful for testing)
export function resetBinanceClient(): void {
  client = null;
}
