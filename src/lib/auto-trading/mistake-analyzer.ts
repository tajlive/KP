/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * MISTAKE ANALYZER
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Analyzes user's trading patterns to identify common mistakes:
 * - Trading without stop loss
 * - Overtrading
 * - Revenge trading
 * - Counter-trend trading
 * - Poor risk/reward ratio
 * - Ignoring stop losses
 *
 * Provides personalized learning recommendations.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { createClient } from "@/lib/supabase/server";

export interface TradingMistake {
  type: string;
  title: string;
  description: string;
  frequency: number;
  impact: number; // Total cost in NOK
  lesson: string;
  lessonUrl: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface LearningPlan {
  lessons: Array<{
    title: string;
    url: string;
    priority: number;
    estimatedTime: number; // minutes
  }>;
  totalEstimatedTime: number;
  focusAreas: string[];
}

export interface AnalysisResult {
  mistakes: TradingMistake[];
  learningPlan: LearningPlan;
  tradingScore: number;
  summary: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    totalPnl: number;
    mistakesCost: number;
    potentialSavings: number;
  };
}

/**
 * Mistake Analyzer - Identifies trading mistakes and generates learning plans
 */
export class MistakeAnalyzer {
  private supabasePromise = createClient();

  /**
   * Analyze user's trading mistakes for a session
   */
  async analyzeMistakes(
    userId: string,
    sessionId: string,
  ): Promise<TradingMistake[]> {
    const supabase = await this.supabase;
    const mistakes: TradingMistake[] = [];

    const { data: trades } = (await supabase
      .from("auto_trading_trades" as unknown)
      .select("*")
      .eq("session_id", sessionId)
      .order("opened_at", { ascending: false })) as unknown;

    if (!trades || trades.length === 0) {
      return [];
    }

    const closedTrades = trades.filter(
      (t) => t.status === "CLOSED" && t.pnl_nok !== null,
    );
    const losingTrades = closedTrades.filter((t) => (t.pnl_nok || 0) < 0);

    // MISTAKE 1: Trading without stop loss
    const noStopLossTrades = trades.filter((t) => !t.stop_loss_price);
    if (noStopLossTrades.length > 0) {
      const impact = noStopLossTrades
        .filter((t) => (t.pnl_nok || 0) < 0)
        .reduce((sum, t) => sum + Math.abs(t.pnl_nok || 0), 0);

      mistakes.push({
        type: "no_stop_loss",
        title: "Handel uten stop-loss",
        description: `Du har ${noStopLossTrades.length} trades uten stop-loss. Dette er ekstremt risikabelt.`,
        frequency: noStopLossTrades.length,
        impact: impact,
        lesson:
          "Stop-loss er din viktigste beskyttelse mot store tap. Alltid sett stop-loss før du åpner en posisjon.",
        lessonUrl: "/learn/risk-management/stop-loss",
        severity: "critical",
      });
    }

    // MISTAKE 2: Overtrading (more than 10 trades per day)
    const tradesByDay = this.groupTradesByDay(trades);
    let overtradingDays = 0;
    let overtradingLosses = 0;

    for (const [day, dayTrades] of Object.entries(tradesByDay)) {
      if (dayTrades.length > 10) {
        overtradingDays++;
        overtradingLosses += dayTrades
          .filter((t) => (t.pnl_nok || 0) < 0)
          .reduce((sum, t) => sum + Math.abs(t.pnl_nok || 0), 0);
      }
    }

    if (overtradingDays > 0) {
      mistakes.push({
        type: "overtrading",
        title: "Overtrading",
        description: `Du handlet mer enn 10 ganger på ${overtradingDays} dager. Dette er for mye.`,
        frequency: overtradingDays,
        impact: overtradingLosses,
        lesson:
          "Kvalitet over kvantitet. Vent på høy-sannsynlighet setups i stedet for å trade konstant.",
        lessonUrl: "/learn/psychology/overtrading",
        severity: "high",
      });
    }

    // MISTAKE 3: Revenge trading (trading immediately after big loss)
    let revengeTrades = 0;
    let revengeImpact = 0;

    for (let i = 1; i < closedTrades.length; i++) {
      const prevTrade = closedTrades[i - 1];
      const currentTrade = closedTrades[i];

      if (!prevTrade.pnl_nok || !currentTrade.pnl_nok) continue;

      const timeDiff =
        new Date(currentTrade.opened_at).getTime() -
        new Date(prevTrade.closed_at || prevTrade.opened_at).getTime();
      const timeInMinutes = timeDiff / (60 * 1000);

      // Big loss (>2% of position) followed by quick trade (<5 min)
      if (
        prevTrade.pnl_nok < -prevTrade.position_value_nok * 0.02 &&
        timeInMinutes < 5
      ) {
        revengeTrades++;
        if (currentTrade.pnl_nok < 0) {
          revengeImpact += Math.abs(currentTrade.pnl_nok);
        }
      }
    }

    if (revengeTrades > 0) {
      mistakes.push({
        type: "revenge_trading",
        title: "Revenge trading",
        description: `${revengeTrades} trades ble åpnet kort tid etter store tap.`,
        frequency: revengeTrades,
        impact: revengeImpact,
        lesson:
          "Ta en pause etter tap. Følelser (frustrasjon, sinne) fører til dårlige beslutninger.",
        lessonUrl: "/learn/psychology/revenge-trading",
        severity: "high",
      });
    }

    // MISTAKE 4: Trading against trend (simplified check)
    const largeLosingTrades = losingTrades.filter(
      (t) => Math.abs(t.pnl_nok || 0) > t.position_value_nok * 0.05,
    );

    if (largeLosingTrades.length > closedTrades.length * 0.3) {
      const impact = largeLosingTrades.reduce(
        (sum, t) => sum + Math.abs(t.pnl_nok || 0),
        0,
      );

      mistakes.push({
        type: "counter_trend",
        title: "Trading mot trenden",
        description: `${largeLosingTrades.length} trades med store tap kan indikere counter-trend trading.`,
        frequency: largeLosingTrades.length,
        impact: impact,
        lesson: "The trend is your friend. Trade med trenden, ikke mot den.",
        lessonUrl: "/learn/technical-analysis/trend-following",
        severity: "medium",
      });
    }

    // MISTAKE 5: Poor risk/reward ratio
    const tradesWithPoorRR = closedTrades.filter((t) => {
      const pnl = t.pnl_nok || 0;
      const tradeValue = t.position_value_nok || 1;
      const rrRatio = Math.abs(pnl / tradeValue);

      // If winning trade has < 2% gain, or losing trade has > 3% loss, poor RR
      return (pnl > 0 && rrRatio < 0.02) || (pnl < 0 && rrRatio > 0.03);
    });

    if (tradesWithPoorRR.length > closedTrades.length * 0.4) {
      mistakes.push({
        type: "poor_risk_reward",
        title: "Dårlig risk/reward ratio",
        description: `${tradesWithPoorRR.length} trades hadde ubalansert risk/reward.`,
        frequency: tradesWithPoorRR.length,
        impact: tradesWithPoorRR.reduce(
          (sum, t) => sum + Math.abs(t.pnl_nok || 0),
          0,
        ),
        lesson:
          "Alltid ha minimum 2:1 reward/risk ratio. Taper du 1%, må du kunne tjene minst 2%.",
        lessonUrl: "/learn/risk-management/risk-reward",
        severity: "medium",
      });
    }

    // MISTAKE 6: Ignoring stop loss (price hit SL but trade stayed open)
    const ignoredStopLosses = closedTrades.filter((t) => {
      if (!t.stop_loss_price || !t.exit_price) return false;

      // For LONG: if exit_price < stop_loss_price, SL was ignored
      if (t.side === "LONG" && t.exit_price < t.stop_loss_price) {
        return true;
      }
      // For SHORT: if exit_price > stop_loss_price, SL was ignored
      if (t.side === "SHORT" && t.exit_price > t.stop_loss_price) {
        return true;
      }
      return false;
    });

    if (ignoredStopLosses.length > 0) {
      const impact = ignoredStopLosses.reduce(
        (sum, t) => sum + Math.abs(t.pnl_nok || 0),
        0,
      );

      mistakes.push({
        type: "ignored_stop_loss",
        title: "Ignorerte stop-loss",
        description: `${ignoredStopLosses.length} trades ble holdt forbi stop-loss nivået.`,
        frequency: ignoredStopLosses.length,
        impact: impact,
        lesson:
          "Stop-loss er ikke et forslag, det er en regel. Følg den alltid.",
        lessonUrl: "/learn/risk-management/stop-loss-discipline",
        severity: "critical",
      });
    }

    // Sort by severity and impact
    return mistakes.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return b.impact - a.impact;
    });
  }

  /**
   * Generate personalized learning plan
   */
  async generateLearningPlan(
    userId: string,
    sessionId: string,
  ): Promise<LearningPlan> {
    const mistakes = await this.analyzeMistakes(userId, sessionId);

    const lessons = mistakes.map((mistake, index) => ({
      title: mistake.lesson,
      url: mistake.lessonUrl,
      priority: index + 1,
      estimatedTime:
        mistake.severity === "critical"
          ? 20
          : mistake.severity === "high"
            ? 15
            : 10,
    }));

    const totalEstimatedTime = lessons.reduce(
      (sum, l) => sum + l.estimatedTime,
      0,
    );

    const focusAreas = [
      ...new Set(
        mistakes.map((m) => {
          if (m.type.includes("stop_loss")) return "Risk Management";
          if (m.type.includes("trading") || m.type.includes("revenge"))
            return "Trading Psychology";
          if (m.type.includes("trend")) return "Technical Analysis";
          return "Trading Strategy";
        }),
      ),
    ];

    return {
      lessons,
      totalEstimatedTime,
      focusAreas,
    };
  }

  /**
   * Calculate trading score (0-100)
   */
  async getTradingScore(userId: string, sessionId: string): Promise<number> {
    const supabase = await this.supabase;

    // Get session stats
    const { data: session } = (await supabase
      .from("auto_trading_sessions" as unknown)
      .select("win_rate, total_trades, max_drawdown_pct")
      .eq("id", sessionId)
      .single() as unknown) as unknown;

    if (!session) return 50;

    const mistakes = await this.analyzeMistakes(userId, sessionId);

    // Start with perfect score
    let score = 100;

    // Deduct points based on mistakes
    for (const mistake of mistakes) {
      const deduction =
        mistake.severity === "critical"
          ? 20
          : mistake.severity === "high"
            ? 15
            : mistake.severity === "medium"
              ? 10
              : 5;

      score -= deduction;
    }

    // Bonus for good win rate
    if (session.win_rate > 60) score += 10;
    else if (session.win_rate < 40) score -= 10;

    // Bonus for experience (more trades)
    if (session.total_trades > 20) score += 5;

    // Penalty for high drawdown
    if (session.max_drawdown_pct > 20) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Full analysis with summary
   */
  async analyze(userId: string, sessionId: string): Promise<AnalysisResult> {
    const supabase = await this.supabase;

    const [mistakes, learningPlan, tradingScore] = await Promise.all([
      this.analyzeMistakes(userId, sessionId),
      this.generateLearningPlan(userId, sessionId),
      this.getTradingScore(userId, sessionId),
    ]);

    // Get session summary
    const { data: session } = (await supabase
      .from("auto_trading_sessions" as unknown)
      .select("total_trades, winning_trades, losing_trades, total_pnl_nok")
      .eq("id", sessionId)
      .single() as unknown) as unknown;

    const mistakesCost = mistakes.reduce((sum, m) => sum + m.impact, 0);

    return {
      mistakes,
      learningPlan,
      tradingScore,
      summary: {
        totalTrades: session?.total_trades || 0,
        winningTrades: session?.winning_trades || 0,
        losingTrades: session?.losing_trades || 0,
        totalPnl: session?.total_pnl_nok || 0,
        mistakesCost,
        potentialSavings: mistakesCost * 0.7, // Estimate 70% could have been saved
      },
    };
  }

  // ==================== PRIVATE HELPERS ====================

  private groupTradesByDay(
    trades: Array<{ opened_at: string; pnl_nok?: number }>,
  ): Record<string, typeof trades> {
    const grouped: Record<string, typeof trades> = {};

    for (const trade of trades) {
      const day = trade.opened_at.split("T")[0];
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(trade);
    }

    return grouped;
  }
}

/**
 * Convenience function for quick analysis
 */
export async function analyzeTradingMistakes(
  userId: string,
  sessionId: string,
): Promise<AnalysisResult> {
  const analyzer = new MistakeAnalyzer();
  return analyzer.analyze(userId, sessionId);
}
