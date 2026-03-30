/**
 * Binance Futures Leaderboard API
 * 
 * Henter live data om topp-tradere
 * Viser kun tradere med >30 dager historikk
 * Beregner: return, Sharpe ratio, win rate, max drawdown
 */

import { logError } from "@/lib/sentry";

export interface BinanceLeader {
  encryptedUid: string;
  nickName: string;
  rank: number;
  avatar?: string;
  totalReturn: number;
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
  sharpeRatio: number;
  winRate: number;
  maxDrawdown: number;
  tradeCount: number;
  followerCount: number;
  daysSinceCreated: number;
  isFollowing?: boolean;
}

const BINANCE_FAPI = "https://fapi.binance.com";

/**
 * Fetch Binance futures leaderboard
 */
export async function fetchBinanceLeaderboard(
  type: "ROI" | "PNL" = "ROI",
  limit: number = 20
): Promise<BinanceLeader[]> {
  try {
    const response = await fetch(
      `${BINANCE_FAPI}/fapi/v1/leaderboard?period=ALL&tradeType=PERPETUAL&isIsolated=false&isShared=false&limit=${limit}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        next: { revalidate: 300 }, // Cache 5 minutter
      }
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error("Invalid Binance response format");
    }

    // Map og filtrer
    const leaders: BinanceLeader[] = data.data
      .filter((trader: { daysSinceCreated: number }) => trader.daysSinceCreated >= 30)
      .map((trader: {
        encryptedUid: string;
        nickName: string;
        rank: number;
        avatar?: string;
        value: string;
        dailyROI: string;
        weeklyROI: string;
        monthlyROI: string;
        sharpeRatio: string;
        winRate: string;
        maxDrawdown: string;
        tradeCount: number;
        followerCount: number;
        daysSinceCreated: number;
      }) => ({
        encryptedUid: trader.encryptedUid,
        nickName: trader.nickName || "Anonymous",
        rank: trader.rank,
        avatar: trader.avatar,
        totalReturn: parseFloat(trader.value) || 0,
        dailyReturn: parseFloat(trader.dailyROI) || 0,
        weeklyReturn: parseFloat(trader.weeklyROI) || 0,
        monthlyReturn: parseFloat(trader.monthlyROI) || 0,
        sharpeRatio: parseFloat(trader.sharpeRatio) || 0,
        winRate: parseFloat(trader.winRate) * 100 || 0,
        maxDrawdown: parseFloat(trader.maxDrawdown) || 0,
        tradeCount: trader.tradeCount || 0,
        followerCount: trader.followerCount || 0,
        daysSinceCreated: trader.daysSinceCreated,
      }))
      .slice(0, 10); // Topp 10

    return leaders;
  } catch (error) {
    logError(error instanceof Error ? error : String(error), { domain: "binance_leaderboard" });
    return [];
  }
}

/**
 * Get detailed trader stats
 */
export async function getTraderDetails(encryptedUid: string): Promise<{
  positions: Array<{
    symbol: string;
    side: "LONG" | "SHORT";
    entryPrice: number;
    markPrice: number;
    pnl: number;
    roe: number;
    updateTime: string;
  }>;
  history: Array<{
    symbol: string;
    side: string;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    closeTime: string;
  }>;
} | null> {
  try {
    // Hent åpne posisjoner
    const positionsRes = await fetch(
      `${BINANCE_FAPI}/fapi/v1/leaderboardPosition?encryptedUid=${encryptedUid}&tradeType=PERPETUAL`,
      { next: { revalidate: 60 } }
    );

    // Hent historikk
    const historyRes = await fetch(
      `${BINANCE_FAPI}/fapi/v1/leaderboardHistory?encryptedUid=${encryptedUid}&tradeType=PERPETUAL`,
      { next: { revalidate: 300 } }
    );

    const positions = positionsRes.ok ? await positionsRes.json() : [];
    const history = historyRes.ok ? await historyRes.json() : [];

    return {
      positions: positions.data || [],
      history: history.data || [],
    };
  } catch (error) {
    logError(error instanceof Error ? error : String(error), { domain: "trader_details", encryptedUid });
    return null;
  }
}

/**
 * Beregn risiko-score for trader
 */
export function calculateTraderRiskScore(trader: BinanceLeader): {
  score: number;
  level: "low" | "medium" | "high";
  warnings: string[];
} {
  const warnings: string[] = [];
  let score = 100;

  // Sharpe ratio (høyere er bedre)
  if (trader.sharpeRatio < 1) {
    score -= 20;
    warnings.push("Lav Sharpe ratio - høy risiko for avkastning");
  } else if (trader.sharpeRatio < 2) {
    score -= 10;
    warnings.push("Middels Sharpe ratio");
  }

  // Max drawdown (lavere er bedre)
  if (trader.maxDrawdown > 50) {
    score -= 30;
    warnings.push("Svært høy max drawdown (>50%)");
  } else if (trader.maxDrawdown > 30) {
    score -= 15;
    warnings.push("Høy max drawdown (>30%)");
  }

  // Win rate
  if (trader.winRate < 40) {
    score -= 15;
    warnings.push("Lav win rate (<40%)");
  }

  // Trade count (erfaring)
  if (trader.tradeCount < 50) {
    score -= 10;
    warnings.push("Få trades - begrenset historikk");
  }

  const level = score >= 70 ? "low" : score >= 40 ? "medium" : "high";

  return { score: Math.max(0, score), level, warnings };
}

export default {
  fetchBinanceLeaderboard,
  getTraderDetails,
  calculateTraderRiskScore,
};
