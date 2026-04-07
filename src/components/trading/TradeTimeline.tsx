"use client";

import { useState } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Minus,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineTrade {
  id: string;
  executed_at: string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
  total_value: number;
  realized_pnl: number | null;
  explanation: {
    title: string;
    body: string;
    mood: "positive" | "negative" | "neutral" | "warning";
  };
  indicators?: {
    rsi?: number;
    macd?: number;
    sma_20?: number;
    sma_50?: number;
    price?: number;
  } | null;
}

interface TradeTimelineProps {
  trades: TimelineTrade[];
  className?: string;
}

function getMoodIcon(mood: TimelineTrade["explanation"]["mood"]) {
  switch (mood) {
    case "positive":
      return <TrendingUp className="w-5 h-5 text-green-500" />;
    case "negative":
      return <TrendingDown className="w-5 h-5 text-red-500" />;
    case "warning":
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    default:
      return <Minus className="w-5 h-5 text-gray-500" />;
  }
}

function getMoodColor(mood: TimelineTrade["explanation"]["mood"]) {
  switch (mood) {
    case "positive":
      return "bg-green-50 border-green-200";
    case "negative":
      return "bg-red-50 border-red-200";
    case "warning":
      return "bg-amber-50 border-amber-200";
    default:
      return "bg-gray-50 border-gray-200";
  }
}

function formatNOK(value: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return format(date, "d. MMMM, HH:mm", { locale: nb });
}

function TradeItem({ trade }: { trade: TimelineTrade }) {
  const [expanded, setExpanded] = useState(false);

  const isProfitable = trade.realized_pnl && trade.realized_pnl > 0;
  const isLoss = trade.realized_pnl && trade.realized_pnl < 0;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all duration-200",
        getMoodColor(trade.explanation.mood),
        expanded && "shadow-md"
      )}
    >
      {/* Header - alltid synlig */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          {getMoodIcon(trade.explanation.mood)}
          <div>
            <p className="font-medium text-gray-900">
              {trade.explanation.title}
            </p>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDateTime(trade.executed_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p
              className={cn(
                "font-semibold",
                trade.side === "buy" ? "text-blue-600" : "text-purple-600"
              )}
            >
              {trade.side === "buy" ? "Kjøpte" : "Solgte"}
            </p>
            <p className="text-sm text-gray-600">
              {formatNOK(trade.total_value)}
            </p>
          </div>

          {/* PnL visning for salg */}
          {trade.side === "sell" && trade.realized_pnl !== null && (
            <div className="text-right min-w-[80px]">
              <p
                className={cn(
                  "font-semibold",
                  isProfitable && "text-green-600",
                  isLoss && "text-red-600",
                  !isProfitable && !isLoss && "text-gray-600"
                )}
              >
                {isProfitable && "+"}
                {formatNOK(trade.realized_pnl)}
              </p>
            </div>
          )}

          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-gray-700 leading-relaxed">
            {trade.explanation.body}
          </p>

          {/* Indikatorer hvis tilgjengelig */}
          {trade.indicators && (
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              {trade.indicators.rsi !== undefined && (
                <div className="bg-white rounded px-3 py-2">
                  <span className="text-gray-500">RSI</span>
                  <p className="font-medium">{trade.indicators.rsi.toFixed(1)}</p>
                </div>
              )}
              {trade.indicators.macd !== undefined && (
                <div className="bg-white rounded px-3 py-2">
                  <span className="text-gray-500">MACD</span>
                  <p className="font-medium">{trade.indicators.macd.toFixed(2)}</p>
                </div>
              )}
              {trade.indicators.sma_20 !== undefined && (
                <div className="bg-white rounded px-3 py-2">
                  <span className="text-gray-500">SMA 20</span>
                  <p className="font-medium">
                    {formatNOK(trade.indicators.sma_20)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Detaljer */}
          <div className="mt-4 text-sm text-gray-500 flex flex-wrap gap-4">
            <span>Pris: {formatNOK(trade.price)}</span>
            <span>Mengde: {trade.quantity.toFixed(6)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function TradeTimeline({ trades, className }: TradeTimelineProps) {
  if (trades.length === 0) {
    return (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        <p>Ingen trades ennå</p>
        <p className="text-sm mt-1">Trades vil vises her når de skjer</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {trades.map((trade) => (
        <TradeItem key={trade.id} trade={trade} />
      ))}
    </div>
  );
}

export default TradeTimeline;
