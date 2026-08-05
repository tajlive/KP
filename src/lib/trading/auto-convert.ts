/**
 * Automatisk konvertering av fiat (USD/EUR) til USDT for live trading.
 * Bruker Spot Market API — ikke Convert API (blokkert for fiat).
 */

import { createHmac } from "crypto";

const BINANCE_API_URL = "https://api.binance.com";

interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
}

interface BinanceOrderResponse {
  symbol: string;
  orderId: number;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: string;
  fills?: Array<{
    price: string;
    qty: string;
    commission: string;
    commissionAsset: string;
  }>;
}

function signRequest(query: string, secret: string): string {
  return createHmac("sha256", secret).update(query).digest("hex");
}

async function getAccountBalances(
  apiKey: string,
  apiSecret: string,
): Promise<BinanceBalance[]> {
  const timestamp = Date.now();
  const query = `timestamp=${timestamp}`;
  const signature = signRequest(query, apiSecret);

  const response = await fetch(
    `${BINANCE_API_URL}/api/v3/account?${query}&signature=${signature}`,
    {
      headers: { "X-MBX-APIKEY": apiKey },
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Binance API error: ${error.msg || response.statusText}`);
  }

  const data = await response.json();
  return data.balances.filter(
    (b: BinanceBalance) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0,
  );
}

async function spotMarketBuy(
  apiKey: string,
  apiSecret: string,
  symbol: string,
  quoteOrderQty: string,
): Promise<BinanceOrderResponse> {
  const timestamp = Date.now();
  const query = `symbol=${symbol}&side=BUY&type=MARKET&quoteOrderQty=${quoteOrderQty}&timestamp=${timestamp}`;
  const signature = signRequest(query, apiSecret);

  const response = await fetch(
    `${BINANCE_API_URL}/api/v3/order?${query}&signature=${signature}`,
    {
      method: "POST",
      headers: { "X-MBX-APIKEY": apiKey },
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Binance order error: ${error.msg || response.statusText}`);
  }

  return response.json();
}

/**
 * Sjekker om bruker har nok USDT. Hvis ikke, konverterer USD/EUR automatisk.
 * Returnerer tilgjengelig USDT-balanse etter eventuell konvertering.
 */
export async function ensureUsdtCapital(
  apiKey: string,
  apiSecret: string,
  requiredUsdt: number,
): Promise<{ success: boolean; usdtAvailable: number; error?: string }> {
  try {
    const balances = await getAccountBalances(apiKey, apiSecret);

    // Sjekk nåværende USDT
    const usdtBalance = balances.find((b) => b.asset === "USDT");
    const usdtAvailable = usdtBalance ? parseFloat(usdtBalance.free) : 0;

    if (usdtAvailable >= requiredUsdt) {
      return { success: true, usdtAvailable };
    }

    // Finn fiat til å konvertere (USD eller EUR)
    const fiatBalance = balances.find((b) =>
      ["USD", "EUR"].includes(b.asset) && parseFloat(b.free) > 0
    );

    if (!fiatBalance) {
      return {
        success: false,
        usdtAvailable,
        error: "Ingen fiat (USD/EUR) tilgjengelig for konvertering",
      };
    }

    const fiatAmount = parseFloat(fiatBalance.free);
    const fiatNeeded = requiredUsdt - usdtAvailable;
    const convertAmount = Math.min(fiatAmount, fiatNeeded);

    if (convertAmount < 1) {
      return {
        success: false,
        usdtAvailable,
        error: "For lite fiat til konvertering (minimum 1)",
      };
    }

    // Konverter via Spot Market
    const symbol = `USDT${fiatBalance.asset}`;
    const order = await spotMarketBuy(
      apiKey,
      apiSecret,
      symbol,
      convertAmount.toString(),
    );

    const usdtReceived = parseFloat(order.executedQty);
    const totalUsdt = usdtAvailable + usdtReceived;

    return {
      success: totalUsdt >= requiredUsdt,
      usdtAvailable: totalUsdt,
    };
  } catch (error) {
    return {
      success: false,
      usdtAvailable: 0,
      error: error instanceof Error ? error.message : "Ukjent feil",
    };
  }
}

/**
 * Henter alle ikke-null balances for en bruker.
 */
export async function getBinanceBalances(
  apiKey: string,
  apiSecret: string,
): Promise<BinanceBalance[]> {
  return getAccountBalances(apiKey, apiSecret);
}
