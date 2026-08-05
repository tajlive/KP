/**
 * Auto-reinvestering for Kraken grid-trading
 * Reinvesterer gevinst automatisk i nye grid-nivåer
 */

import { KrakenClient } from "@/lib/exchanges/kraken/client";

const REINVEST_THRESHOLD = 10; // $10 minimum for reinvestering
const REINVEST_PERCENTAGE = 0.8; // 80% av gevinst reinvesteres

export interface GridProfit {
  totalInvested: number;
  currentValue: number;
  profit: number;
  profitPercent: number;
}

export async function checkAndReinvest(
  userId: string,
  apiKey: string,
  apiSecret: string,
): Promise<{ reinvested: boolean; amount?: number; error?: string }> {
  try {
    const client = new KrakenClient(apiKey, apiSecret);
    
    // Hent balanse
    const balance = await client.getBalance();
    const usdtBalance = parseFloat(balance.USDT || "0");
    
    // Hent åpne ordrer for å beregne investert kapital
    const openOrders = await client.getOpenOrders();
    
    // Beregn total investert (forenklet)
    let totalInvested = 0;
    for (const order of Object.values(openOrders)) {
      const o = order as { descr?: { price?: string; volume?: string } };
      if (o.descr?.price && o.descr?.volume) {
        totalInvested += parseFloat(o.descr.price) * parseFloat(o.descr.volume);
      }
    }
    
    // Beregn gevinst (forenklet — i produksjon: hent trade-historikk)
    const currentValue = usdtBalance + totalInvested;
    const profit = currentValue - totalInvested;
    
    if (profit < REINVEST_THRESHOLD) {
      return { reinvested: false, amount: 0 };
    }
    
    // Beregn reinvesteringsbeløp
    const reinvestAmount = profit * REINVEST_PERCENTAGE;
    
    // Start ny grid-sesjon med reinvestert kapital
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/kraken/grid/start`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.CRON_SECRET!,
        },
        body: JSON.stringify({
          userId,
          capital: reinvestAmount,
          symbol: "BTCUSDT", // Default symbol
        }),
      },
    );
    
    if (!response.ok) {
      throw new Error("Failed to start reinvestment grid");
    }
    
    return { reinvested: true, amount: reinvestAmount };
  } catch (error) {
    return {
      reinvested: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getGridProfit(
  apiKey: string,
  apiSecret: string,
): Promise<GridProfit> {
  const client = new KrakenClient(apiKey, apiSecret);
  
  const balance = await client.getBalance();
  const usdtBalance = parseFloat(balance.USDT || "0");
  
  const openOrders = await client.getOpenOrders();
  
  let totalInvested = 0;
  for (const order of Object.values(openOrders)) {
    const o = order as { descr?: { price?: string; volume?: string } };
    if (o.descr?.price && o.descr?.volume) {
      totalInvested += parseFloat(o.descr.price) * parseFloat(o.descr.volume);
    }
  }
  
  const currentValue = usdtBalance + totalInvested;
  const profit = currentValue - totalInvested;
  
  return {
    totalInvested,
    currentValue,
    profit,
    profitPercent: totalInvested > 0 ? (profit / totalInvested) * 100 : 0,
  };
}
