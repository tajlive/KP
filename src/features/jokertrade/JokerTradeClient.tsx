"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { JokerButton } from "./JokerButton";
import { AgentVotes, type AgentVote } from "./AgentVotes";
import { PositionCard, type PositionData } from "./PositionCard";
import { TradeHistory } from "./TradeHistory";

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
  agent_votes?: AgentVote[];
  total_buy?: number;
  total_sell?: number;
  total_hold?: number;
}

interface JokerTradeClientProps {
  initialData?: JokerTradeData;
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

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s siden`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min siden`;
  const hours = Math.floor(minutes / 60);
  return `${hours}t siden`;
}

// ---------------------------------------------------------------------------
// State A: Not logged in — Hero with stats
// ---------------------------------------------------------------------------

function HeroPrompt() {
  const t = useTranslations("jokertrade");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20 text-center">
      {/* Joker emoji */}
      <div className="mb-6">
        <span className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-kp-brand/10 text-4xl shadow-[0_0_40px_rgba(245,158,11,0.2)]">
          🃏
        </span>
      </div>

      <h1 className="font-sans text-3xl font-extrabold tracking-tight text-kp-text-primary sm:text-4xl">
        {t("heroTitle")}
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-sm text-kp-text-secondary sm:text-base">
        {t("heroDesc")}
      </p>

      {/* Stats row */}
      <div className="mt-10 flex items-center justify-center gap-8 text-center">
        <div>
          <p className="font-mono text-2xl font-bold text-kp-text-primary sm:text-3xl">
            100K
          </p>
          <p className="text-xs text-kp-text-muted">{t("statsTraders")}</p>
        </div>
        <div className="h-10 w-px bg-kp-border" />
        <div>
          <p className="font-mono text-2xl font-bold text-kp-text-primary sm:text-3xl">
            12
          </p>
          <p className="text-xs text-kp-text-muted">{t("statsTrades")}</p>
        </div>
        <div className="h-10 w-px bg-kp-border" />
        <div>
          <p className="font-mono text-2xl font-bold text-kp-text-primary sm:text-3xl">
            30
          </p>
          <p className="text-xs text-kp-text-muted">{t("statsResponse")}</p>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-10">
        <a
          href="/no/register"
          className="inline-flex items-center gap-2 rounded-2xl bg-kp-brand px-10 py-5 font-extrabold text-kp-bg-primary transition-all hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(245,158,11,0.6)] active:scale-[0.98]"
        >
          {t("startFree")}
        </a>
      </div>

      {/* How it works */}
      <div className="mx-auto mt-12 max-w-md rounded-2xl border border-kp-border bg-kp-bg-card/80 p-6 text-left backdrop-blur-xl">
        <h3 className="font-sans text-sm font-bold text-kp-text-primary">
          {t("howItWorks")}
        </h3>
        <ol className="mt-4 space-y-4 text-sm text-kp-text-secondary">
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-kp-brand/15 text-xs font-bold text-kp-brand">
              1
            </span>
            <span>
              <strong className="text-kp-text-primary">{t("step1Title")}</strong>{" "}
              — {t("step1Desc")}
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-kp-brand/15 text-xs font-bold text-kp-brand">
              2
            </span>
            <span>
              <strong className="text-kp-text-primary">{t("step2Title")}</strong>{" "}
              — {t("step2Desc")}
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-kp-brand/15 text-xs font-bold text-kp-brand">
              3
            </span>
            <span>
              <strong className="text-kp-text-primary">{t("step3Title")}</strong>{" "}
              — {t("step3Desc")}
            </span>
          </li>
        </ol>
      </div>

      <p className="mt-8 text-xs text-kp-text-muted">{t("ctaSubtext")}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// State B: Logged in, no trades — WelcomeBanner with JokerButton
// ---------------------------------------------------------------------------

function WelcomeBanner({
  onStart,
  loading,
}: {
  onStart: () => Promise<void>;
  loading: boolean;
}) {
  const t = useTranslations("jokertrade");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 text-center">
      <div className="mx-auto max-w-lg rounded-2xl border border-kp-border-brand/20 bg-gradient-to-b from-kp-brand-subtle to-transparent p-6 sm:p-8">
        <span className="inline-flex h-14 w-14 items-center justify-center text-3xl">
          🃏
        </span>
        <h2 className="mt-4 font-sans text-xl font-extrabold text-kp-text-primary sm:text-2xl">
          {t("welcomeTitle")}
        </h2>
        <p className="mt-2 text-sm text-kp-text-secondary sm:text-base">
          {t("welcomeDesc")}
        </p>
        <ul className="mt-4 space-y-2 text-left text-xs text-kp-text-secondary sm:text-sm">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-kp-brand">🎯</span>
            <span>{t("welcomeBullet1")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-kp-brand">🛡️</span>
            <span>{t("welcomeBullet2")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-kp-brand">📊</span>
            <span>{t("welcomeBullet3")}</span>
          </li>
        </ul>

        <div className="mt-6 flex justify-center">
          <JokerButton onClick={onStart} loading={loading} />
        </div>

        <p className="mt-3 text-[10px] text-kp-text-muted">
          {t("disclaimer")}
        </p>
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
    <div className="rounded-lg border border-kp-border bg-kp-bg-secondary px-4 py-3">
      <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-kp-text-muted">
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function JokerTradeClient({ initialData }: JokerTradeClientProps) {
  const { user, loading: authLoading } = useAuth();
  const t = useTranslations("jokertrade");
  const router = useRouter();

  const dataInit: JokerTradeData = initialData ?? {
    status: "active",
    insight: null,
    mode: "paper",
    positions: [],
    history: [],
    agent_votes: [],
    total_buy: 0,
    total_sell: 0,
    total_hold: 0,
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
          agent_votes: json.agent_votes ?? [],
          total_buy: json.total_buy ?? 0,
          total_sell: json.total_sell ?? 0,
          total_hold: json.total_hold ?? 0,
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
  // Auth states
  // -----------------------------------------------------------------------

  // Loading — auth spinner
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-kp-brand border-t-transparent" />
      </div>
    );
  }

  // STATE A: Not logged in — hero with stats + CTA
  if (!user) {
    return <HeroPrompt />;
  }

  // STATE B: Logged in, no trades — WelcomeBanner
  if (!hasTrades) {
    return <WelcomeBanner onStart={triggerJoker} loading={triggeringJoker} />;
  }

  // STATE C: Logged in with trades — full dashboard
  return (
    <div
      id="jokertrade-dashboard"
      className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8"
    >
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-sans text-3xl font-extrabold tracking-tight text-kp-text-primary sm:text-4xl">
            {t("dashboardTitle")}
          </h1>
          <p className="mt-1 font-sans text-sm text-kp-text-muted">
            {t("dashboardSubtitle", {
              mode: data.mode === "paper" ? "Lekepenger" : "Live",
            })}
          </p>
        </div>

        <span className="font-sans text-xs text-kp-text-muted">
          {t("updatedAgo", { time: timeAgo(lastUpdated) })}
        </span>
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          label={t("openPositions")}
          value={String(data.positions.length)}
          mono={false}
          color="text-kp-text-primary"
        />
        <StatCard
          label={t("closedTrades")}
          value={String(data.history.length)}
          mono={false}
          color="text-kp-text-primary"
        />
        <StatCard
          label={t("openPnl")}
          value={formatNOK(openPnl)}
          mono
          color={openPnl >= 0 ? "text-kp-success" : "text-kp-danger"}
        />
        <StatCard
          label={t("totalPnl")}
          value={formatNOK(totalPnl)}
          mono
          color={totalPnl >= 0 ? "text-kp-success" : "text-kp-danger"}
        />
      </div>

      {/* Main content grid */}
      <div className="grid gap-6">
        {/* Joker Button */}
        <div className="flex justify-center">
          <JokerButton onClick={triggerJoker} loading={triggeringJoker} />
        </div>

        {/* Open positions */}
        {data.positions.length > 0 && (
          <div>
            <h2 className="mb-3 font-sans text-sm font-semibold uppercase tracking-widest text-kp-text-secondary">
              {t("openPositionsTitle")}
            </h2>
            <div className="grid gap-4">
              {data.positions.map((pos) => {
                const positionData: PositionData = {
                  id: pos.id,
                  trading_pair: pos.symbol,
                  side: pos.side,
                  quantity: pos.quantity,
                  entry_price: pos.price,
                  current_price: pos.price,
                  pnl: Number(pos.pnl ?? 0),
                  pnl_pct: 0,
                };
                return (
                  <PositionCard key={pos.id} position={positionData} />
                );
              })}
            </div>
          </div>
        )}

        {/* Agent votes */}
        {data.agent_votes && data.agent_votes.length > 0 && (
          <AgentVotes
            votes={data.agent_votes}
            totalBuy={data.total_buy ?? 0}
            totalSell={data.total_sell ?? 0}
            totalHold={data.total_hold ?? 0}
            action={data.insight?.action}
            confidence={data.insight?.confidence}
            reasoning={data.insight?.content ?? null}
          />
        )}

        {/* Trade history */}
        <TradeHistory trades={data.history} />
      </div>
    </div>
  );
}
