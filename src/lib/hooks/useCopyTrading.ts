"use client";

import { CopyTradingRequirements, CopyTradingStatus } from "@/types/trading";
import { useEffect, useState } from "react";

const COPY_TRADING_REQUIREMENTS: CopyTradingRequirements = {
  minPaperTrades: 50,
  minSubscriptionTier: "bachelor",
  allowedModes: ["live"],
};

export interface CopySession {
  id: string;
  sourceSessionId: string;
  sourceTraderName: string;
  capital: number;
  currentCapital: number;
  totalPnl: number;
  totalPnlPercent: string;
  winRate: string;
  tradedCount: number;
  status: string;
  startedAt: string;
  endedAt?: string;
}

export function useCopyTrading() {
  const [status, setStatus] = useState<
    CopyTradingStatus & { activeSessions: CopySession[] }
  >({
    canCopyTrade: false,
    paperTradesCount: 0,
    currentMode: "paper",
    subscriptionTier: "student",
    activeSessions: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCopyTradingStatus = async () => {
      try {
        // KLA-auth: browser-klienten er alltid anon — tier og trade-telling
        // hentes via server-APIer som leser httpOnly auth-cookie
        const profileRes = await fetch("/api/user/profile", {
          credentials: "same-origin",
        });
        if (!profileRes.ok) {
          setIsLoading(false);
          return;
        }
        const profileJson = await profileRes.json().catch(() => null);
        const subscriptionTier = profileJson?.profile?.tier || "student";

        // Tell paper-trades via analytics-APIets modeSplit
        let paperTradesCount = 0;
        const analyticsRes = await fetch("/api/user/trading-analytics", {
          credentials: "same-origin",
        });
        if (analyticsRes.ok) {
          const analytics = await analyticsRes.json().catch(() => null);
          const split = analytics?.modeSplit as
            | { mode: string; trades: number }[]
            | undefined;
          paperTradesCount =
            split?.find((m) => m.mode === "paper")?.trades ?? 0;
        }

        const currentMode = "paper";

        const { canCopyTrade, reason } = checkCopyTradingEligibility(
          paperTradesCount,
          currentMode,
          subscriptionTier,
        );

        let activeSessions: CopySession[] = [];
        if (canCopyTrade) {
          try {
            const copyRes = await fetch("/api/auto-trading/copy");
            if (copyRes.ok) {
              const copyData = await copyRes.json();
              if (copyData.success) {
                activeSessions = copyData.copySessions;
              }
            }
          } catch (e) {
            console.error("Failed to load active copy sessions", e);
          }
        }

        setStatus({
          canCopyTrade,
          reason,
          paperTradesCount,
          currentMode,
          subscriptionTier,
          activeSessions,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load copy trading status",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchCopyTradingStatus();
  }, []);

  return {
    ...status,
    isLoading,
    error,
    requirements: COPY_TRADING_REQUIREMENTS,
    progress: Math.min(
      (status.paperTradesCount / COPY_TRADING_REQUIREMENTS.minPaperTrades) *
        100,
      100,
    ),
  };
}

function checkCopyTradingEligibility(
  paperTradesCount: number,
  currentMode: string,
  subscriptionTier: string,
): { canCopyTrade: boolean; reason?: string } {
  // Check if in live mode
  if (!COPY_TRADING_REQUIREMENTS.allowedModes.includes(currentMode as "live")) {
    if (paperTradesCount < COPY_TRADING_REQUIREMENTS.minPaperTrades) {
      return {
        canCopyTrade: false,
        reason: `Copy trading is disabled in paper mode to ensure you learn trading fundamentals first. Complete ${COPY_TRADING_REQUIREMENTS.minPaperTrades} paper trades (${paperTradesCount}/${COPY_TRADING_REQUIREMENTS.minPaperTrades}) or switch to live mode.`,
      };
    }
    // If they have 50+ paper trades, allow in paper mode too
    return { canCopyTrade: true };
  }

  // Check subscription tier
  const tierLevels: { [key: string]: number } = {
    free: 0,
    student: 1,
    bachelor: 2,
    master: 3,
    phd: 4,
    professor: 5,
  };

  const userTierLevel = tierLevels[subscriptionTier] || 0;
  const requiredTierLevel =
    tierLevels[COPY_TRADING_REQUIREMENTS.minSubscriptionTier] || 0;

  if (userTierLevel < requiredTierLevel) {
    return {
      canCopyTrade: false,
      reason: `Copy trading requires ${COPY_TRADING_REQUIREMENTS.minSubscriptionTier} subscription or higher. Your current tier: ${subscriptionTier}.`,
    };
  }

  return { canCopyTrade: true };
}

// Get disabled reason for UI
export function getCopyTradingDisabledReason(
  paperTradesCount: number,
  currentMode: string,
  subscriptionTier: string,
): string {
  const { reason } = checkCopyTradingEligibility(
    paperTradesCount,
    currentMode,
    subscriptionTier,
  );
  return reason || "Copy trading is currently unavailable";
}
