"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  AlertCircle, 
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Zap,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { useTranslations } from "next-intl";
import { generateExplanation } from "@/lib/trader-explanations";
import type { TradeReasonCode, TradeSide, TradeReasonParams, IndicatorSnapshot } from "@/types/trading";

interface TradeEvent {
  id: string;
  sessionId: string;
  timestamp: string;
  side: TradeSide;
  symbol: string;
  price: number;
  quantity: number;
  totalValue: number;
  realizedPnl: number | null;
  reasonCode: TradeReasonCode | null;
  reasonParams: Record<string, unknown> | null;
  indicatorSnapshot: Record<string, unknown> | null;
}

interface TradeEventFeedProps {
  sessionId?: string;
  events?: TradeEvent[];
  className?: string;
  maxEvents?: number;
  showChartMarkers?: boolean;
  locale?: "no" | "en";
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  BUY: <ArrowUpCircle className="w-5 h-5" />,
  SELL: <ArrowDownCircle className="w-5 h-5" />,
  TAKE_PROFIT: <Target className="w-5 h-5" />,
  STOP_LOSS: <Shield className="w-5 h-5" />,
  RSI_DIP_BUY: <TrendingDown className="w-5 h-5" />,
  DCA_INTERVAL_BUY: <RefreshCw className="w-5 h-5" />,
  GRID_BUY: <Zap className="w-5 h-5" />,
  MULTI_SIGNAL_BUY: <TrendingUp className="w-5 h-5" />,
};

const MOOD_STYLES = {
  positive: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    icon: "text-emerald-500",
  },
  neutral: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
    icon: "text-blue-500",
  },
  negative: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
    icon: "text-red-500",
  },
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    icon: "text-amber-500",
  },
};

function formatTimeAgo(timestamp: string, t: (key: string, values?: Record<string, string | number | Date>) => string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t("justNow");
  if (diffMins < 60) return t("minsAgo", { count: diffMins });
  if (diffHours < 24) return t("hoursAgo", { count: diffHours });
  return t("daysAgo", { count: diffDays });
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function EventCard({ 
  event, 
  locale,
  t
}: { 
  event: TradeEvent; 
  locale: "no" | "en";
  t: (key: string, values?: Record<string, string | number | Date>) => string;
}) {
  const explanation = generateExplanation({
    reasonCode: event.reasonCode,
    reasonParams: event.reasonParams as unknown as TradeReasonParams | null,
    indicatorSnapshot: event.indicatorSnapshot as unknown as IndicatorSnapshot | null,
    side: event.side,
    locale,
  });

  const styles = MOOD_STYLES[explanation.mood];
  const icon = EVENT_ICONS[event.reasonCode || "BUY"] || EVENT_ICONS.BUY;
  const isBuy = event.side === "buy";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`relative p-4 rounded-xl border ${styles.bg} ${styles.border} transition-all hover:shadow-lg`}
    >
      {/* Timestamp badge */}
      <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-slate-500">
        <Clock className="w-3 h-3" />
        {formatTimeAgo(event.timestamp, t)}
      </div>

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-full ${styles.bg} flex items-center justify-center ${styles.icon}`}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold ${styles.text}`}>
              {explanation.title}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${styles.bg} ${styles.text}`}>
              {isBuy ? t("buy") : t("sell")}
            </span>
          </div>

          <p className="text-sm text-slate-400 mb-2 line-clamp-2">
            {explanation.body}
          </p>

          {/* Trade details */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-500">
              {event.symbol}
            </span>
            <span className="text-white font-medium">
              {formatPrice(event.price)}
            </span>
            <span className="text-slate-500">
              {event.quantity.toFixed(4)}
            </span>
            {event.realizedPnl !== null && (
              <span className={event.realizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                {event.realizedPnl >= 0 ? "+" : ""}
                {event.realizedPnl.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Mini chart with trade markers
function MiniChartWithMarkers({ 
  events, 
  t,
  className = "" 
}: { 
  events: TradeEvent[]; 
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  className?: string;
}) {
  // Simulated price background for visual context only — NOT real market data
  const chartData = useRef<number[]>([]);

  if (chartData.current.length === 0) {
    let price = 850000;
    for (let i = 0; i < 50; i++) {
      price = price * (1 + (Math.random() - 0.48) * 0.02);
      chartData.current.push(price);
    }
  }

  const min = Math.min(...chartData.current);
  const max = Math.max(...chartData.current);
  const range = max - min;

  return (
    <div className={`relative h-32 ${className}`}>
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Price line */}
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        <path
          d={`M 0 ${100 - ((chartData.current[0] - min) / range) * 100} ` +
            chartData.current.slice(1).map((p, i) => 
              `L ${((i + 1) / (chartData.current.length - 1)) * 100} ${100 - ((p - min) / range) * 100}`
            ).join(" ")}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
        
        <path
          d={`M 0 ${100 - ((chartData.current[0] - min) / range) * 100} ` +
            chartData.current.slice(1).map((p, i) => 
              `L ${((i + 1) / (chartData.current.length - 1)) * 100} ${100 - ((p - min) / range) * 100}`
            ).join(" ") +
            ` L 100 100 L 0 100 Z`}
          fill="url(#chartGradient)"
        />

        {/* Trade markers */}
        {events.slice(0, 5).map((event, i) => {
          const x = 20 + (i * 15); // Spread markers across chart
          const isBuy = event.side === "buy";
          const y = 30 + (Math.random() * 40); // Random Y position
          
          return (
            <g key={event.id}>
              {/* Marker line */}
              <line
                x1={x}
                y1={y}
                x2={x}
                y2={100}
                stroke={isBuy ? "#10b981" : "#ef4444"}
                strokeWidth="0.5"
                strokeDasharray="2,2"
                opacity="0.5"
              />
              {/* Marker dot */}
              <circle
                cx={x}
                cy={y}
                r="3"
                fill={isBuy ? "#10b981" : "#ef4444"}
                stroke="white"
                strokeWidth="1"
              />
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {t("buy")}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          {t("sell")}
        </span>
      </div>
    </div>
  );
}

export function TradeEventFeed({
  sessionId,
  events: propEvents,
  className = "",
  maxEvents = 10,
  showChartMarkers = true,
  locale = "no",
}: TradeEventFeedProps) {
  const t = useTranslations("TradeEventFeed");
  const [events, setEvents] = useState<TradeEvent[]>(propEvents || []);
  const [loading, setLoading] = useState(!propEvents);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propEvents) {
      setEvents(propEvents);
      return;
    }

    if (!sessionId) return;

    const fetchEvents = async () => {
      try {
        const response = await fetch(`/api/trading/v3/trades/${sessionId}`);
        if (!response.ok) throw new Error("Failed to fetch trades");
        
        const data = await response.json();
        const mappedEvents: TradeEvent[] = data.trades.map((t: Record<string, unknown>) => ({
          id: t.id as string,
          sessionId: data.session_id,
          timestamp: t.executed_at as string,
          side: t.side as TradeSide,
          symbol: (t.trading_pair as string) || "BTC/NOK",
          price: t.price as number,
          quantity: t.quantity as number,
          totalValue: t.total_value as number,
          realizedPnl: t.realized_pnl as number | null,
          reasonCode: t.reason_code as TradeReasonCode | null,
          reasonParams: ((t.explanation as Record<string, unknown> | undefined)?.params || null) as unknown as TradeReasonParams | null,
          indicatorSnapshot: t.indicators as unknown as IndicatorSnapshot | null,
        }));
        
        setEvents(mappedEvents.slice(0, maxEvents));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    
    // Poll for new events
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, [sessionId, propEvents, maxEvents]);

  if (loading) {
    return (
      <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-slate-800 rounded animate-pulse" />
          <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-slate-900 border border-red-500/30 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{t("failedToLoad")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-white">
              {t("recentTrades")}
            </h3>
          </div>
          <button className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors">
            {t("viewAll")}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart with markers */}
      {showChartMarkers && events.length > 0 && (
        <MiniChartWithMarkers events={events} t={t} className="border-b border-slate-800" />
      )}

      {/* Events list */}
      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t("noTradesYet")}</p>
            </div>
          ) : (
            events.map(event => (
              <EventCard key={event.id} event={event} locale={locale} t={t} />
            ))
          )}
      </div>
    </div>
  );
}
