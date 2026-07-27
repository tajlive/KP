"use client";

import { useTranslations } from "next-intl";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentAction = "buy" | "sell" | "hold";

export interface AgentVote {
  agent: string;
  action: AgentAction;
  confidence: number;
}

export interface AgentVotesProps {
  votes: AgentVote[];
  totalBuy: number;
  totalSell: number;
  totalHold: number;
  symbol?: string;
  action?: string;
  confidence?: number;
  reasoning?: string | null;
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function actionLabel(action: AgentAction): string {
  switch (action) {
    case "buy":
      return "BUY";
    case "sell":
      return "SELL";
    case "hold":
      return "HOLD";
  }
}

function actionBadgeColor(action: AgentAction): string {
  switch (action) {
    case "buy":
      return "bg-kp-success-bg text-kp-success";
    case "sell":
      return "bg-kp-danger-bg text-kp-danger";
    case "hold":
      return "bg-kp-warning-bg text-kp-warning";
  }
}

function actionTextColor(action: AgentAction): string {
  switch (action) {
    case "buy":
      return "text-kp-success";
    case "sell":
      return "text-kp-danger";
    case "hold":
      return "text-kp-warning";
  }
}

function barColor(action: AgentAction): string {
  switch (action) {
    case "buy":
      return "bg-kp-success";
    case "sell":
      return "bg-kp-danger";
    case "hold":
      return "bg-kp-warning";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AgentVotes({
  votes,
  totalBuy,
  totalSell,
  totalHold,
  action,
  confidence,
  reasoning,
  isLoading,
}: AgentVotesProps) {
  const t = useTranslations("jokertrade");
  const total = votes.length || 12;

  const dominantAction: AgentAction =
    totalBuy >= totalSell && totalBuy >= totalHold
      ? "buy"
      : totalSell >= totalHold
        ? "sell"
        : "hold";

  return (
    <div className="rounded-2xl border border-kp-border bg-kp-bg-card/80 p-6 backdrop-blur-xl">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-kp-text-secondary">
          {t("agentVotesHeader")}
        </h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            action ? actionBadgeColor(dominantAction) : "bg-kp-bg-hover text-kp-text-muted"
          }`}
        >
          {t("agentVotesConsensus", {
            count: action === "buy" ? totalBuy : totalSell,
            total,
            action: action?.toUpperCase() ?? actionLabel(dominantAction),
          })}
        </span>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-kp-brand border-t-transparent" />
          <span className="ml-3 text-sm text-kp-text-muted">
            {t("agentVotesLoading")}
          </span>
        </div>
      ) : (
        <>
          {/* Agent rows */}
          <div className="space-y-1.5">
            {(votes.length > 0 ? votes : generateMockVotes()).map(
              (vote, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-kp-bg-hover"
                >
                  {/* Agent name (truncated) */}
                  <span className="w-28 shrink-0 truncate font-mono text-xs font-medium text-kp-text-primary">
                    {vote.agent.length > 14
                      ? vote.agent.slice(0, 12) + "…"
                      : vote.agent}
                  </span>

                  {/* Confidence % */}
                  <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-kp-text-secondary">
                    {vote.confidence}%
                  </span>

                  {/* Action badge */}
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      actionBadgeColor(vote.action)
                    }`}
                  >
                    {actionLabel(vote.action)}
                  </span>

                  {/* Confidence bar */}
                  <div className="flex-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-kp-bg-hover">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor(vote.action)}`}
                        style={{ width: `${vote.confidence}%` }}
                      />
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>

          {/* Footer: totals */}
          <div className="mt-4 flex items-center justify-between border-t border-kp-border pt-3">
            <div className="flex gap-3 text-xs font-semibold">
              <span className="text-kp-success">{totalBuy} BUY</span>
              <span className="text-kp-danger">{totalSell} SELL</span>
              <span className="text-kp-warning">{totalHold} HOLD</span>
            </div>
            {confidence !== undefined && (
              <span className="font-mono text-xs tabular-nums text-kp-text-muted">
                ⚡ {confidence}% conf.
              </span>
            )}
          </div>

          {/* Reasoning */}
          {reasoning && (
            <p className="mt-3 text-xs leading-relaxed text-kp-text-secondary italic">
              {reasoning}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mock generator — fallback when no real votes exist
// ---------------------------------------------------------------------------

const MOCK_AGENTS = [
  "PriceAction Pro",
  "VolumeMaster",
  "TrendHunter",
  "RSI Scout",
  "MACD Oracle",
  "Bollinger Bot",
  "Ichimoku AI",
  "FibFinder",
  "SupportSniper",
  "ResistanceKing",
  "SentimentCore",
  "OrderFlowX",
];

function generateMockVotes(): AgentVote[] {
  return MOCK_AGENTS.map((agent) => {
    const r = Math.random();
    const action: AgentAction = r < 0.5 ? "buy" : r < 0.8 ? "sell" : "hold";
    const confidence = Math.floor(Math.random() * 40) + 55; // 55-95
    return { agent, action, confidence };
  });
}
