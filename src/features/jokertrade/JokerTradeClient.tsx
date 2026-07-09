"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Trophy } from "lucide-react";
import { JokerButton } from "./JokerButton";
import { TradeStatus } from "./TradeStatus";
import { ActivePositions } from "./ActivePositions";
import { TradeHistory } from "./TradeHistory";
import { CoinCarousel } from "./CoinCarousel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface Position {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  current_price: number | null;
  pnl: number | null;
  pnl_percent: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  created_at: string;
}

interface TradeRecord {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  pnl: number | null;
  pnl_percent: number | null;
  closed_at: string;
  created_at: string;
}

interface JokerTradeData {
  status: "active" | "paused";
  insight: Insight | null;
  mode: "paper" | "live";
  positions: Position[];
  history: TradeRecord[];
}

interface JokerTradeClientProps {
  initialData: JokerTradeData;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JokerTradeClient({ initialData }: JokerTradeClientProps) {
  const [data, setData] = useState<JokerTradeData>(initialData);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [triggeringJoker, setTriggeringJoker] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -----------------------------------------------------------------------
  // Fetch dashboard data
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/jokertrade");
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        setData({
          status: json.status,
          insight: json.insight,
          mode: json.mode,
          positions: json.positions,
          history: json.history,
        });
        setLastUpdated(new Date());
      }
    } catch {
      // Silent — polling shouldn't spam console
    }
  }, []);

  // -----------------------------------------------------------------------
  // Poll every 30 seconds
  // -----------------------------------------------------------------------

  useEffect(() => {
    pollRef.current = setInterval(fetchData, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchData]);

  // -----------------------------------------------------------------------
  // Trigger Joker analysis
  // -----------------------------------------------------------------------

  const triggerJoker = useCallback(async () => {
    if (triggeringJoker) return;
    setTriggeringJoker(true);
    try {
      const res = await fetch("/api/jokertrade", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        // Refresh data immediately to show new insight
        await fetchData();
      }
    } catch {
      // Silent
    } finally {
      setTriggeringJoker(false);
    }
  }, [triggeringJoker, fetchData]);

  // -----------------------------------------------------------------------
  // Compute P&L totals
  // -----------------------------------------------------------------------

  const openPnl = data.positions.reduce(
    (sum, p) => sum + Number(p.pnl ?? 0),
    0,
  );
  const closedPnl = data.history.reduce(
    (sum, t) => sum + Number(t.pnl ?? 0),
    0,
  );
  const totalPnl = openPnl + closedPnl;

  const openPnlPct = data.positions.reduce(
    (sum, p) => sum + Number(p.pnl_percent ?? 0),
    0,
  );

  // -----------------------------------------------------------------------
  // Format helpers
  // -----------------------------------------------------------------------

  function formatNOK(value: number): string {
    const abs = Math.abs(value);
    const formatted = abs.toLocaleString("no-NO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${value >= 0 ? "+" : "-"}${formatted} kr`;
  }

  function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s siden`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}min siden`;
    const hours = Math.floor(minutes / 60);
    return `${hours}t siden`;
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-sans text-3xl font-extrabold tracking-tight text-[#F9FAFB] sm:text-4xl">
            🎭 JokerTrade
          </h1>
          <p className="mt-1 font-sans text-sm text-[#6B7280]">
            AI-drevet trading med Joker-modus
          </p>
        </div>

        {/* Last updated */}
        <span className="font-sans text-xs text-[#6B7280]">
          Sist oppdatert: {timeAgo(lastUpdated)}
        </span>
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          label="Åpne posisjoner"
          value={String(data.positions.length)}
          mono={false}
          color="text-[#F9FAFB]"
        />
        <StatCard
          label="Lukkede trades"
          value={String(data.history.length)}
          mono={false}
          color="text-[#F9FAFB]"
        />
        <StatCard
          label="Open P&L"
          value={formatNOK(openPnl)}
          mono
          color={openPnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}
        />
        <StatCard
          label="Total P&L"
          value={formatNOK(totalPnl)}
          mono
          color={totalPnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}
        />
      </div>

      {/* Joker Button */}
      <div className="mb-6 sm:mb-8">
        <JokerButton onClick={triggerJoker} loading={triggeringJoker} />
      </div>

      {/* Main content grid */}
      <div className="grid gap-4 sm:gap-6">
        {/* Trade Status (with AI insight) */}
        <TradeStatus
          status={data.status}
          insight={data.insight}
          mode={data.mode}
        />

        {/* Active Positions */}
        <ActivePositions positions={data.positions} />

        {/* Trade History */}
        <TradeHistory trades={data.history} />
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-center gap-2 font-sans text-xs text-[#6B7280]">
        <Trophy className="h-4 w-4 text-[#F59E0B]" />
        JokerTrade v1.0 — AI-drevet av Hermes Agent
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard (internal)
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  mono,
  color,
}: {
  label: string;
  value: string;
  mono: boolean;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-[#2A2D35] bg-[#15171B] px-4 py-3">
      <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-bold tabular-nums ${
          mono ? "font-mono" : "font-sans"
        } ${color}`}
      >
        {value}
      </p>
    </div>
  );
}
