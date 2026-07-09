"use client";

import { Shield, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";

interface Insight {
  id: string;
  title: string;
  content: string;
  sentiment: string;
  sentiment_score: number;
  action: string;
  confidence: number;
  created_at: string;
}

interface TradeStatusProps {
  status: "active" | "paused";
  insight: Insight | null;
  mode: "paper" | "live";
}

function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case "bullish":
      return "text-[#10B981]";
    case "bearish":
      return "text-[#EF4444]";
    default:
      return "text-[#F59E0B]";
  }
}

function getActionBadge(action: string): { label: string; color: string } {
  switch (action) {
    case "LONG":
      return { label: "🔵 LONG", color: "bg-[#064E3B] text-[#10B981]" };
    case "SHORT":
      return { label: "🔴 SHORT", color: "bg-[#7F1D1D] text-[#EF4444]" };
    case "HOLD":
      return { label: "🟡 HOLD", color: "bg-[#78350F] text-[#F59E0B]" };
    default:
      return { label: "⚪ WAIT", color: "bg-[#1A1D26] text-[#9CA3AF]" };
  }
}

export function TradeStatus({ status, insight, mode }: TradeStatusProps) {
  return (
    <div className="rounded-xl border border-[#2A2D35] bg-[#1A1D26]/80 p-6 backdrop-blur-xl">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-[#9CA3AF]">
          JokerTrade Status
        </h2>
        <div className="flex items-center gap-3">
          {/* Trading mode */}
          <span className="flex items-center gap-1.5 rounded-full bg-[#15171B] px-3 py-1 text-xs font-medium text-[#9CA3AF]">
            <Shield className="h-3.5 w-3.5" />
            {mode === "paper" ? "Paper" : "Live"}
          </span>

          {/* Status badge */}
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              status === "active"
                ? "bg-[#064E3B] text-[#10B981]"
                : "bg-[#7F1D1D] text-[#EF4444]"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                status === "active" ? "bg-[#10B981] animate-pulse" : "bg-[#EF4444]"
              }`}
            />
            {status === "active" ? "Aktiv" : "Pauset"}
          </span>
        </div>
      </div>

      {/* AI Insight */}
      {insight ? (
        <div className="rounded-lg border border-[#2A2D35] bg-gradient-to-br from-[#1A1D26] to-[#78350F]/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-sans text-sm font-semibold text-[#F9FAFB]">
              <Activity className="h-4 w-4 text-[#FCD34D]" />
              🧠 AI siste innsikt
            </h3>
            <span className="text-xs text-[#6B7280]">
              {formatDistanceToNow(new Date(insight.created_at), {
                addSuffix: true,
                locale: nb,
              })}
            </span>
          </div>

          <p className="mb-3 font-sans text-sm leading-relaxed text-[#D1D5DB]">
            {insight.title}
          </p>

          {/* Signal badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                getActionBadge(insight.action).color
              }`}
            >
              {getActionBadge(insight.action).label}
            </span>
            <span
              className={`text-xs font-semibold ${getSentimentColor(insight.sentiment)}`}
            >
              {insight.sentiment === "bullish"
                ? "Bullish"
                : insight.sentiment === "bearish"
                  ? "Bearish"
                  : "Nøytral"}{" "}
              ({insight.sentiment_score})
            </span>
            <span className="text-xs font-mono text-[#9CA3AF]">
              Confidence: {insight.confidence}%
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#2A2D35] py-8">
          <Activity className="mb-2 h-8 w-8 text-[#6B7280]" />
          <p className="font-sans text-sm text-[#6B7280]">
            Ingen AI-analyse ennå
          </p>
          <p className="mt-1 font-sans text-xs text-[#6B7280]">
            Trykk på Joker-knappen for å starte analyse
          </p>
        </div>
      )}
    </div>
  );
}
