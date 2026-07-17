"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/new/AuthContext";
import { useRouter } from "next/navigation";
import { JokerIcon } from "./JokerIcons";
import { JokerButton } from "./JokerButton";
import { TradeStatus } from "./TradeStatus";
import { ActivePositions } from "./ActivePositions";
import { TradeHistory } from "./TradeHistory";
import { LiveFeed } from "@/features/live/LiveFeed";
import { JokerPush } from "@/features/live/JokerPush";
import { LeaderboardChanges } from "@/features/live/LeaderboardChanges";
import { Sparkles, LogIn, ArrowDown } from "lucide-react";

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
  pnl: number | null;
  created_at: string;
}

interface TradeRecord {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  pnl: number | null;
  executed_at: string;
  created_at: string;
  joker_trade?: boolean;
  joker_explanation?: string | null;
}

interface JokerTradeData {
  status: "active" | "paused";
  insight: Insight | null;
  mode: "paper" | "live";
  positions: Position[];
  history: TradeRecord[];
}

interface JokerTradeClientProps {
  initialData?: JokerTradeData;
}

// ---------------------------------------------------------------------------
// Login prompt for unauthenticated users
// ---------------------------------------------------------------------------

function LoginPrompt() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 text-center">
      <JokerIcon className="mx-auto h-16 w-16 sm:h-20 sm:w-20 text-[#F59E0B]" />
      <h2 className="mt-6 font-sans text-2xl font-extrabold text-[#F9FAFB] sm:text-3xl">
        Klar for å la AI-en handle for deg?
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-[#9CA3AF] sm:text-base">
        JokerTrade er din personlige AI-trader. Den analyserer markedet 24/7 og
        finner de beste handlene — mens du gjør andre ting.
      </p>

      <div className="mt-8 rounded-xl border border-[#2A2D35] bg-[#15171B] p-6 text-left">
        <h3 className="font-sans text-sm font-bold text-[#F9FAFB]">
          🎭 Slik fungerer det:
        </h3>
        <ol className="mt-4 space-y-3 text-sm text-[#9CA3AF]">
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F59E0B]/15 text-xs font-bold text-[#F59E0B]">
              1
            </span>
            <span>
              <strong className="text-[#F9FAFB]">Logg inn</strong> — opprett en
              gratis konto på 30 sekunder
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F59E0B]/15 text-xs font-bold text-[#F59E0B]">
              2
            </span>
            <span>
              <strong className="text-[#F9FAFB]">Trykk JOKER</strong> — AI-en
              analyserer markedet og finner beste trade
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F59E0B]/15 text-xs font-bold text-[#F59E0B]">
              3
            </span>
            <span>
              <strong className="text-[#F9FAFB]">Se pengene vokse</strong> —
              du får 100 000 kr i lekepenger. Null risiko.
            </span>
          </li>
        </ol>
      </div>

      <button
        onClick={() => router.push("/no/login?next=%2Fno%2Fjokertrade")}
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#F59E0B] px-8 py-4 font-bold text-[#0A0B0D] shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(245,158,11,0.6)] active:scale-[0.98]"
      >
        <LogIn className="h-5 w-5" />
        Logg inn og start JokerTrade
      </button>

      <p className="mt-4 text-xs text-[#6B7280]">
        Gratis — 100 000 kr i lekepenger — ingen binding
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Welcome for first-time users
// ---------------------------------------------------------------------------

function WelcomeBanner({
  onStart,
  loading,
}: {
  onStart: () => Promise<void>;
  loading: boolean;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 text-center">
      <div className="mx-auto max-w-lg rounded-2xl border border-[#F59E0B]/20 bg-gradient-to-b from-[#F59E0B]/5 to-transparent p-6 sm:p-8">
        <JokerIcon className="mx-auto h-14 w-14 text-[#F59E0B]" />
        <h2 className="mt-4 font-sans text-xl font-extrabold text-[#F9FAFB] sm:text-2xl">
          🎭 Velkommen til JokerTrade!
        </h2>
        <p className="mt-2 text-sm text-[#9CA3AF] sm:text-base">
          Din AI-trader er klar. Trykk på JOKER-knappen så finner AI-en den
          beste trade-opportuniteten akkurat nå — helt automatisk.
        </p>
        <ul className="mt-4 space-y-2 text-left text-xs text-[#9CA3AF] sm:text-sm">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-[#F59E0B]">🎯</span>
            <span>
              AI-en scanner 50+ kryptopar og velger det med høyest sannsynlighet
              for gevinst
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-[#F59E0B]">🛡️</span>
            <span>
              Du handler med <strong>lekepenger</strong> — 100 000 kr, null
              risiko
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-[#F59E0B]">📊</span>
            <span>
              Alle handler logges så du kan følge med på resultatene
            </span>
          </li>
        </ul>

        <div className="flex justify-center">
          <JokerButton onClick={onStart} loading={loading} />
        </div>

        <p className="mt-3 text-[10px] text-[#6B7280]">
          AI-drevne analyser — ikke finansiell rådgivning
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JokerTradeClient({ initialData }: JokerTradeClientProps) {
  const { user, loading: authLoading } = useAuth();
  const dataInit: JokerTradeData = initialData ?? {
    status: "active",
    insight: null,
    mode: "paper",
    positions: [],
    history: [],
  };
  const [data, setData] = useState<JokerTradeData>(dataInit);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [triggeringJoker, setTriggeringJoker] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasTrades = data.history.length > 0 || data.positions.length > 0;

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
    if (!user) return;
    pollRef.current = setInterval(fetchData, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchData, user]);

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
  // Auth states
  // -----------------------------------------------------------------------

  // Loading — show spinner
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F59E0B] border-t-transparent" />
      </div>
    );
  }

  // Not logged in — show login prompt
  if (!user) {
    return <LoginPrompt />;
  }

  // Logged in, first time — show welcome
  if (!hasTrades) {
    return <WelcomeBanner onStart={triggerJoker} loading={triggeringJoker} />;
  }

  // Logged in with trades — full dashboard
  return (
    <div id="jokertrade-dashboard" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-sans text-3xl font-extrabold tracking-tight text-[#F9FAFB] sm:text-4xl">
            🎭 JokerTrade
          </h1>
          <p className="mt-1 font-sans text-sm text-[#6B7280]">
            AI-drevet trading — {data.mode === "paper" ? "Lekepenger" : "Live"}
          </p>
        </div>

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
        <TradeStatus
          status={data.status}
          insight={data.insight}
          mode={data.mode}
        />
        <ActivePositions positions={data.positions} />
        <TradeHistory trades={data.history} />
      </div>

      {/* Live Feed */}
      <div className="mt-8 sm:mt-10">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#2A2D35]" />
          <h2 className="font-sans text-lg font-bold text-[#F9FAFB]">
            ⚡ Live Feed
          </h2>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#2A2D35]" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <LiveFeed />
          </div>
          <div className="space-y-4">
            <JokerPush />
            <LeaderboardChanges />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-center gap-2 font-sans text-xs text-[#6B7280]">
        <JokerIcon className="h-4 w-4 text-[#F59E0B]" />
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
