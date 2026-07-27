"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AgentVotes, type AgentVote } from "./AgentVotes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PositionData {
  id?: string;
  trading_pair: string;
  side: "buy" | "sell";
  quantity: number;
  entry_price: number;
  current_price: number;
  pnl: number;
  pnl_pct: number;
  agent_votes?: AgentVote[];
  joker_explanation?: string | null;
}

export interface PositionCardProps {
  position: PositionData;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNOK(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("no-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value >= 0 ? "+" : "-"}${formatted} kr`;
}

function formatPrice(value: number): string {
  return value.toLocaleString("no-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PositionCard({ position }: PositionCardProps) {
  const t = useTranslations("jokertrade");
  const [expanded, setExpanded] = useState(false);

  const isLong = position.side === "buy";
  const isProfit = position.pnl >= 0;

  return (
    <div className="rounded-2xl border border-kp-border bg-kp-bg-card/80 p-5 backdrop-blur-xl transition-colors hover:border-kp-border-light sm:p-6">
      {/* Top row: pair + side + P&L */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Trading pair */}
          <span className="font-mono text-base font-bold text-kp-text-primary">
            {position.trading_pair}
          </span>
          {/* Side badge */}
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              isLong
                ? "bg-kp-success-bg text-kp-success"
                : "bg-kp-danger-bg text-kp-danger"
            }`}
          >
            {isLong ? "LONG" : "SHORT"}
          </span>
        </div>

        {/* P&L */}
        <div className="text-right">
          <p
            className={`flex items-center gap-1 font-mono text-lg font-bold tabular-nums ${
              isProfit ? "text-kp-success" : "text-kp-danger"
            }`}
          >
            {isProfit ? "▲" : "▼"}
            {formatNOK(position.pnl)}
          </p>
          <p
            className={`font-mono text-xs tabular-nums ${
              isProfit ? "text-kp-success" : "text-kp-danger"
            }`}
          >
            {isProfit ? "+" : ""}
            {position.pnl_pct.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Details grid */}
      <div className="mb-4 grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
        <div>
          <p className="font-sans text-kp-text-muted">
            {t("positionQuantity")}
          </p>
          <p className="font-mono tabular-nums text-kp-text-primary">
            {position.quantity.toFixed(4)}
          </p>
        </div>
        <div>
          <p className="font-sans text-kp-text-muted">
            {t("positionEntryPrice")}
          </p>
          <p className="font-mono tabular-nums text-kp-text-primary">
            {formatPrice(position.entry_price)}
          </p>
        </div>
        <div>
          <p className="font-sans text-kp-text-muted">
            {t("positionAvgPrice")}
          </p>
          <p className="font-mono tabular-nums text-kp-text-primary">
            {formatPrice(position.entry_price)}
          </p>
        </div>
        <div>
          <p className="font-sans text-kp-text-muted">
            {t("positionCurrentPrice")}
          </p>
          <p className="font-mono tabular-nums text-kp-text-primary">
            {formatPrice(position.current_price)}
          </p>
        </div>
      </div>

      {/* Expandable agent votes */}
      {position.joker_explanation && (
        <div className="border-t border-kp-border pt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between text-xs font-semibold text-kp-text-secondary transition-colors hover:text-kp-text-primary"
          >
            <span className="flex items-center gap-1">
              {t("positionJokerExplanation")}
            </span>
            <span>{expanded ? t("positionWhyClose") : t("positionWhy")}</span>
          </button>

          {expanded && (
            <div className="mt-3 space-y-3">
              {/* Joker explanation */}
              <div className="rounded-lg border border-kp-border bg-kp-bg-hover/50 p-3">
                <p className="text-xs leading-relaxed text-kp-text-secondary">
                  {position.joker_explanation}
                </p>
              </div>

              {/* Agent votes */}
              {position.agent_votes && position.agent_votes.length > 0 && (
                <AgentVotes
                  votes={position.agent_votes}
                  totalBuy={position.agent_votes.filter(
                    (v) => v.action === "buy",
                  ).length}
                  totalSell={position.agent_votes.filter(
                    (v) => v.action === "sell",
                  ).length}
                  totalHold={position.agent_votes.filter(
                    (v) => v.action === "hold",
                  ).length}
                  confidence={Math.max(
                    ...position.agent_votes.map((v) => v.confidence),
                  )}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
