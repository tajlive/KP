"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

const INSIGHT_ICONS = {
  time_pattern: "🕐",
  strategy_regime: "📊",
  holding_asymmetry: "⏱",
  overtrading: "🔄",
  tilt_detection: "🎰",
  position_sizing: "📐",
  correlation_blind: "🔗",
  streak_pattern: "🔥",
  weekly_summary: "📋",
  milestone: "🏆",
};

const SEVERITY_COLORS = {
  critical: "#ff3366",
  warning: "#ff6b35",
  info: "#4a9eff",
  positive: "#00d4aa",
};

const BUCKET_LABELS = {
  morning: "06–12",
  afternoon: "12–18",
  evening: "18–23",
  night: "23–06",
};

const REGIME_LABELS = {
  trending_up: "Trending ↑",
  trending_down: "Trending ↓",
  ranging: "Ranging",
  volatile: "Volatil",
};

// ═══════════════════════════════════════════════════════════
// MOCK DATA (Replace with Supabase queries)
// ═══════════════════════════════════════════════════════════

// Seeded random generator for consistent mock data between server and client
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateMockData() {
  const strategies = ["ma_crossover", "rsi", "macd", "bollinger", "breakout", "ai_ml"];
  const regimes = ["trending_up", "trending_down", "ranging", "volatile"];
  const symbols = ["BTC", "ETH", "SOL", "XRP", "ADA", "AVAX", "DOT", "LINK"];
  const buckets = ["morning", "afternoon", "evening", "night"];

  const trades = [];
  let balance = 1000000;
  // Use fixed reference date for consistent mock data
  const referenceDate = new Date('2026-02-10T00:00:00.000Z');

  for (let i = 0; i < 147; i++) {
    // Use seeded random for consistent values
    const seed = i * 1000;
    const daysAgo = Math.floor(seededRandom(seed) * 60);
    const date = new Date(referenceDate);
    date.setDate(date.getDate() - daysAgo);
    const hour = Math.floor(seededRandom(seed + 1) * 24);
    date.setHours(hour);

    const bucket = hour >= 6 && hour < 12 ? "morning" : hour >= 12 && hour < 18 ? "afternoon" : hour >= 18 && hour < 23 ? "evening" : "night";
    const strategy = strategies[Math.floor(seededRandom(seed + 2) * strategies.length)];
    const regime = regimes[Math.floor(seededRandom(seed + 3) * regimes.length)];
    const symbol = symbols[Math.floor(seededRandom(seed + 4) * symbols.length)];
    const side = seededRandom(seed + 5) > 0.35 ? "long" : "short";

    // Realistic win rates: worse at night, better in morning
    let winChance = 0.52;
    if (bucket === "night") winChance = 0.30;
    if (bucket === "morning") winChance = 0.61;
    if (strategy === "ai_ml" && regime === "trending_up") winChance = 0.68;
    if (strategy === "rsi" && regime === "ranging") winChance = 0.35;

    const isWin = seededRandom(seed + 6) < winChance;
    const pnlPct = isWin
      ? seededRandom(seed + 7) * 8 + 0.5
      : -(seededRandom(seed + 8) * 6 + 0.5);
    const posSize = 0.02 + seededRandom(seed + 9) * 0.15;
    const pnl = balance * posSize * (pnlPct / 100);
    balance += pnl;

    const holdingHours = isWin
      ? 2 + seededRandom(seed + 10) * 20
      : 5 + seededRandom(seed + 11) * 40; // Losers held longer

    trades.push({
      id: `trade-${i}`,
      symbol,
      side,
      strategy_used: strategy,
      market_regime: regime,
      risk_level: "standard",
      entry_price: 1000 + seededRandom(seed + 12) * 90000,
      exit_price: 1000 + seededRandom(seed + 13) * 90000,
      pnl: Math.round(pnl),
      pnl_pct: Math.round(pnlPct * 100) / 100,
      position_size_pct: Math.round(posSize * 100 * 10) / 10,
      time_of_day_bucket: bucket,
      day_of_week: date.getDay() === 0 ? 6 : date.getDay() - 1,
      holding_seconds: Math.round(holdingHours * 3600),
      opened_at: date.toISOString(),
      closed_at: new Date(date.getTime() + holdingHours * 3600000).toISOString(),
      was_after_loss: seededRandom(seed + 14) > 0.6,
      trades_last_hour: Math.floor(seededRandom(seed + 15) * 6),
      status: "closed",
    });
  }

  const insights = [
    {
      id: "ins-1",
      type: "time_pattern",
      severity: "critical",
      title: "Du taper 70% av trades om natten",
      description: "Mellom 23:00 og 06:00 har du en win rate på bare 30%. På dagtid er den 61%. 23 trades analysert.",
      recommendation: "Vurder å stoppe trading etter 23:00. Legg inn en regel.",
      evidence: { night_wr: 0.30, day_wr: 0.61, sample: 23 },
      is_active: true,
    },
    {
      id: "ins-2",
      type: "holding_asymmetry",
      severity: "warning",
      title: "Du holder tapere 2.4x lengre enn vinnere",
      description: "Snitt holdetid for vinnere: 8.2 timer. For tapere: 19.7 timer. Dette er disposisjonseffekten — en av de vanligste feilene i trading.",
      recommendation: "Sett tidsbasert stop-loss. Hvis en trade ikke er i pluss etter 12 timer, vurder å lukke.",
      evidence: { avg_win_hold: 8.2, avg_loss_hold: 19.7, ratio: 2.4 },
      is_active: true,
    },
    {
      id: "ins-3",
      type: "tilt_detection",
      severity: "warning",
      title: "Etter tap øker du posisjonsstørrelse med 47%",
      description: "Når forrige trade var et tap, bruker du i snitt 11.2% av kapitalen. Normalt bruker du 7.6%.",
      recommendation: "Etter et tap: ta en 30-minutters pause. Behold normal posisjonsstørrelse.",
      evidence: { normal_size: 7.6, after_loss_size: 11.2, increase: 47 },
      is_active: true,
    },
    {
      id: "ins-4",
      type: "strategy_regime",
      severity: "info",
      title: "RSI funker dårlig i ranging markeder",
      description: "RSI-strategien din har 35% win rate i ranging markeder, men 58% i trending. 31 trades analysert.",
      recommendation: "Bruk RSI kun når markedet trender. Sjekk BTC-trend først.",
      evidence: { rsi_ranging_wr: 0.35, rsi_trending_wr: 0.58, sample: 31 },
      is_active: true,
    },
    {
      id: "ins-5",
      type: "milestone",
      severity: "positive",
      title: "100+ trades fullført!",
      description: "Du har nå nok data til at mønstergjenkjenningen gir pålitelige resultater. Innsiktene blir mer presise herfra.",
      evidence: { total_trades: 147 },
      is_active: true,
    },
    {
      id: "ins-6",
      type: "overtrading",
      severity: "warning",
      title: "5+ trades/time = -1.8% snitt",
      description: "Når du gjør 5 eller flere trades i timen, er snittresultatet -1.8%. Ved 1-2 trades/time er det +0.9%.",
      recommendation: "Sett en maks-grense på 3 trades per time.",
      evidence: { high_freq_pnl: -1.8, low_freq_pnl: 0.9, threshold: 5 },
      is_active: true,
    },
  ];

  return { trades, insights, balance: Math.round(balance) };
}

// ═══════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ═══════════════════════════════════════════════════════════

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "12px",
      padding: "20px",
    }}>
      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "8px", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: "28px", fontWeight: 700, color: color || "#fff", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

function InsightCard({ insight, onDismiss }) {
  const color = SEVERITY_COLORS[insight.severity];
  const icon = INSIGHT_ICONS[insight.type];

  return (
    <div style={{
      background: `${color}08`,
      border: `1px solid ${color}25`,
      borderRadius: "12px",
      padding: "20px",
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span style={{ fontSize: "18px" }}>{icon}</span>
            <span style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color,
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontWeight: 600,
              background: `${color}15`,
              padding: "2px 8px",
              borderRadius: "4px",
            }}>
              {insight.severity}
            </span>
          </div>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#fff", marginBottom: "6px" }}>
            {insight.title}
          </h3>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
            {insight.description}
          </p>
          {insight.recommendation && (
            <div style={{
              marginTop: "12px",
              padding: "10px 12px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "8px",
              fontSize: "13px",
              color: "rgba(255,255,255,0.6)",
              borderLeft: `2px solid ${color}40`,
            }}>
              💡 {insight.recommendation}
            </div>
          )}
        </div>
        <button
          onClick={() => onDismiss(insight.id)}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.2)",
            cursor: "pointer",
            fontSize: "18px",
            padding: "4px",
            lineHeight: 1,
          }}
          title="Avvis"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function CalendarHeatmap({ trades }) {
  const dailyPnl = useMemo(() => {
    const map = {};
    trades.forEach((t) => {
      const day = t.opened_at.slice(0, 10);
      map[day] = (map[day] || 0) + t.pnl;
    });
    return map;
  }, [trades]);

  // Use fixed reference date for consistent hydration
  const referenceDate = new Date('2026-02-10T00:00:00.000Z');
  const days = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, pnl: dailyPnl[key] || 0, day: d });
  }

  const maxAbs = Math.max(...days.map((d) => Math.abs(d.pnl)), 1);

  return (
    <div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "16px" }}>
        Siste 60 dager — daglig P/L
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
        {days.map((d) => {
          const intensity = Math.min(Math.abs(d.pnl) / maxAbs, 1);
          const bg = d.pnl === 0
            ? "rgba(255,255,255,0.04)"
            : d.pnl > 0
              ? `rgba(0, 212, 170, ${0.15 + intensity * 0.65})`
              : `rgba(255, 51, 102, ${0.15 + intensity * 0.65})`;
          return (
            <div
              key={d.date}
              title={`${d.date}: ${d.pnl >= 0 ? "+" : ""}$${d.pnl.toLocaleString()}`}
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "3px",
                background: bg,
                cursor: "default",
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.3)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", gap: "16px", marginTop: "10px", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(255,51,102,0.6)" }} /> Tap
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }} /> Ingen trades
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(0,212,170,0.6)" }} /> Profitt
        </span>
      </div>
    </div>
  );
}

function TimeOfDayChart({ trades }) {
  const stats = useMemo(() => {
    const buckets = { morning: { w: 0, l: 0 }, afternoon: { w: 0, l: 0 }, evening: { w: 0, l: 0 }, night: { w: 0, l: 0 } };
    trades.forEach((t) => {
      if (!t.time_of_day_bucket || t.status === "open") return;
      if (t.pnl > 0) buckets[t.time_of_day_bucket].w++;
      else buckets[t.time_of_day_bucket].l++;
    });
    return Object.entries(buckets).map(([key, val]) => ({
      bucket: key,
      label: BUCKET_LABELS[key],
      total: val.w + val.l,
      winRate: val.w + val.l > 0 ? Math.round((val.w / (val.w + val.l)) * 100) : 0,
      wins: val.w,
      losses: val.l,
    }));
  }, [trades]);

  const maxTotal = Math.max(...stats.map((s) => s.total), 1);

  return (
    <div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "20px" }}>
        Win rate per tidsperiode
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {stats.map((s) => {
          const wr = s.winRate;
          const barColor = wr >= 55 ? "#00d4aa" : wr >= 45 ? "#4a9eff" : "#ff3366";
          return (
            <div key={s.bucket}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                  {s.label}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: barColor, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                  {wr}% <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>({s.total} trades)</span>
                </span>
              </div>
              <div style={{ height: "8px", background: "rgba(255,255,255,0.04)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${wr}%`,
                  background: barColor,
                  borderRadius: "4px",
                  transition: "width 0.6s ease",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DispositionChart({ trades }) {
  const { avgWinHold, avgLossHold } = useMemo(() => {
    const wins = trades.filter((t) => t.pnl > 0 && t.holding_seconds);
    const losses = trades.filter((t) => t.pnl < 0 && t.holding_seconds);
    return {
      avgWinHold: wins.length ? wins.reduce((s, t) => s + t.holding_seconds, 0) / wins.length / 3600 : 0,
      avgLossHold: losses.length ? losses.reduce((s, t) => s + t.holding_seconds, 0) / losses.length / 3600 : 0,
    };
  }, [trades]);

  const maxHold = Math.max(avgWinHold, avgLossHold, 1);

  return (
    <div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "20px" }}>
        Disposisjonseffekten — holdetid
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {[
          { label: "Vinnere", value: avgWinHold, color: "#00d4aa" },
          { label: "Tapere", value: avgLossHold, color: "#ff3366" },
        ].map((item) => (
          <div key={item.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>{item.label}</span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: item.color, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                {item.value.toFixed(1)}t
              </span>
            </div>
            <div style={{ height: "24px", background: "rgba(255,255,255,0.04)", borderRadius: "6px", overflow: "hidden", position: "relative" }}>
              <div style={{
                height: "100%",
                width: `${(item.value / maxHold) * 100}%`,
                background: `${item.color}30`,
                borderRadius: "6px",
                borderRight: `3px solid ${item.color}`,
                transition: "width 0.8s ease",
              }} />
            </div>
          </div>
        ))}
      </div>
      {avgLossHold > avgWinHold * 1.5 && (
        <div style={{
          marginTop: "16px",
          padding: "10px 12px",
          background: "rgba(255,51,102,0.06)",
          border: "1px solid rgba(255,51,102,0.15)",
          borderRadius: "8px",
          fontSize: "12px",
          color: "rgba(255,255,255,0.5)",
          lineHeight: 1.6,
        }}>
          ⚠ Du holder tapende trades {(avgLossHold / avgWinHold).toFixed(1)}x lengre enn vinnere.
          Vurder en tidsbasert exit-regel.
        </div>
      )}
    </div>
  );
}

function StrategyBreakdown({ trades }) {
  const stats = useMemo(() => {
    const map = {};
    trades.forEach((t) => {
      if (!t.strategy_used || t.status === "open") return;
      if (!map[t.strategy_used]) map[t.strategy_used] = { wins: 0, losses: 0, totalPnl: 0 };
      if (t.pnl > 0) map[t.strategy_used].wins++;
      else map[t.strategy_used].losses++;
      map[t.strategy_used].totalPnl += t.pnl;
    });
    return Object.entries(map)
      .map(([strat, val]) => ({
        strategy: strat,
        total: val.wins + val.losses,
        winRate: Math.round((val.wins / (val.wins + val.losses)) * 100),
        totalPnl: Math.round(val.totalPnl),
      }))
      .sort((a, b) => b.totalPnl - a.totalPnl);
  }, [trades]);

  return (
    <div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "16px" }}>
        Strategi-breakdown
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {stats.map((s) => (
          <div
            key={s.strategy}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                fontSize: "12px",
                fontWeight: 600,
                color: "#fff",
                minWidth: "100px",
              }}>
                {s.strategy.replace("_", " ").toUpperCase()}
              </span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                {s.total} trades
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <span style={{
                fontSize: "12px",
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                color: s.winRate >= 55 ? "#00d4aa" : s.winRate >= 45 ? "#4a9eff" : "#ff3366",
              }}>
                {s.winRate}% WR
              </span>
              <span style={{
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                color: s.totalPnl >= 0 ? "#00d4aa" : "#ff3366",
                minWidth: "90px",
                textAlign: "right",
              }}>
                {s.totalPnl >= 0 ? "+" : ""}${s.totalPnl.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TradeList({ trades }) {
  const [filter, setFilter] = useState("all"); // all, wins, losses
  const sorted = useMemo(() => {
    let list = [...trades].sort((a, b) => new Date(b.opened_at) - new Date(a.opened_at));
    if (filter === "wins") list = list.filter((t) => t.pnl > 0);
    if (filter === "losses") list = list.filter((t) => t.pnl < 0);
    return list.slice(0, 30);
  }, [trades, filter]);

  const filterBtnStyle = (active) => ({
    background: active ? "rgba(255,255,255,0.08)" : "transparent",
    border: `1px solid ${active ? "rgba(255,255,255,0.15)" : "transparent"}`,
    borderRadius: "6px",
    padding: "6px 14px",
    color: active ? "#fff" : "rgba(255,255,255,0.4)",
    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>
          Siste trades
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {[
            ["all", "Alle"],
            ["wins", "Vinnere"],
            ["losses", "Tapere"],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} style={filterBtnStyle(filter === key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {sorted.map((t) => (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: "rgba(255,255,255,0.01)",
              borderRadius: "6px",
              borderLeft: `2px solid ${t.pnl >= 0 ? "#00d4aa40" : "#ff336640"}`,
              fontSize: "13px",
              transition: "background 0.15s",
              cursor: "default",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.01)")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
              <span style={{
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                fontWeight: 600,
                color: "#fff",
                minWidth: "42px",
              }}>
                {t.symbol}
              </span>
              <span style={{
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "3px",
                background: t.side === "long" ? "rgba(0,212,170,0.1)" : "rgba(255,51,102,0.1)",
                color: t.side === "long" ? "#00d4aa" : "#ff3366",
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                textTransform: "uppercase",
              }}>
                {t.side}
              </span>
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                {t.strategy_used?.replace("_", " ")}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
                {new Date(t.opened_at).toLocaleDateString("no-NO", { day: "2-digit", month: "short" })}
              </span>
              <span style={{
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                fontWeight: 600,
                color: t.pnl >= 0 ? "#00d4aa" : "#ff3366",
                minWidth: "80px",
                textAlign: "right",
              }}>
                {t.pnl >= 0 ? "+" : ""}{t.pnl_pct}%
              </span>
              <span style={{
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                color: t.pnl >= 0 ? "rgba(0,212,170,0.6)" : "rgba(255,51,102,0.6)",
                fontSize: "12px",
                minWidth: "80px",
                textAlign: "right",
              }}>
                {t.pnl >= 0 ? "+" : ""}${t.pnl.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function TradeJournal() {
  const [activeTab, setActiveTab] = useState("overview");
  const [dismissedInsights, setDismissedInsights] = useState(new Set());

  const { trades, insights, balance } = useMemo(() => generateMockData(), []);

  const stats = useMemo(() => {
    const closed = trades.filter((t) => t.status === "closed");
    const wins = closed.filter((t) => t.pnl > 0);
    const losses = closed.filter((t) => t.pnl < 0);
    const totalPnl = closed.reduce((s, t) => s + t.pnl, 0);
    return {
      totalTrades: closed.length,
      winRate: Math.round((wins.length / closed.length) * 100),
      totalPnl: Math.round(totalPnl),
      avgWin: wins.length ? Math.round(wins.reduce((s, t) => s + t.pnl_pct, 0) / wins.length * 100) / 100 : 0,
      avgLoss: losses.length ? Math.round(losses.reduce((s, t) => s + t.pnl_pct, 0) / losses.length * 100) / 100 : 0,
      bestTrade: Math.max(...closed.map((t) => t.pnl)),
      worstTrade: Math.min(...closed.map((t) => t.pnl)),
    };
  }, [trades]);

  const activeInsights = insights.filter((i) => i.is_active && !dismissedInsights.has(i.id));
  const criticalCount = activeInsights.filter((i) => i.severity === "critical" || i.severity === "warning").length;

  const handleDismiss = useCallback((id) => {
    setDismissedInsights((prev) => new Set(prev).add(id));
  }, []);

  const tabStyle = (active) => ({
    background: active ? "rgba(255,255,255,0.06)" : "transparent",
    border: `1px solid ${active ? "rgba(255,255,255,0.1)" : "transparent"}`,
    borderRadius: "8px",
    padding: "10px 20px",
    color: active ? "#fff" : "rgba(255,255,255,0.4)",
    fontSize: "14px",
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: "'Outfit', var(--font-outfit), sans-serif",
    position: "relative",
  });

  return (
    <div style={{
      background: "#080b14",
      color: "#fff",
      minHeight: "100vh",
      fontFamily: "'Outfit', var(--font-outfit), sans-serif",
      padding: "24px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @media (max-width: 768px) {
          .tj-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .tj-analysis-grid { grid-template-columns: 1fr !important; }
          .tj-tab-bar { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        }
        @media (max-width: 480px) {
          .tj-stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Trade Journal
            </h1>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
              Automatisk mønstergjenkjenning basert på {trades.length} trades
            </p>
          </div>
          {criticalCount > 0 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255,107,53,0.1)",
              border: "1px solid rgba(255,107,53,0.25)",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "13px",
              color: "#ff6b35",
            }}>
              ⚠ {criticalCount} mønster krever oppmerksomhet
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="tj-tab-bar" style={{ display: "flex", gap: "4px", marginBottom: "28px" }}>
          {[
            ["overview", "Oversikt"],
            ["insights", `Innsikter (${activeInsights.length})`],
            ["analysis", "Analyse"],
            ["trades", "Trades"],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={tabStyle(activeTab === key)}>
              {label}
            </button>
          ))}
        </div>

        {/* ─── OVERVIEW TAB ──────────────────────── */}
        {activeTab === "overview" && (
          <div>
            {/* Stat cards */}
            <div className="tj-stats-grid" style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "12px",
              marginBottom: "32px",
            }}>
              <StatCard label="Total P/L" value={`${stats.totalPnl >= 0 ? "+" : ""}$${stats.totalPnl.toLocaleString()}`} color={stats.totalPnl >= 0 ? "#00d4aa" : "#ff3366"} sub={`Balanse: $${balance.toLocaleString()}`} />
              <StatCard label="Win Rate" value={`${stats.winRate}%`} color={stats.winRate >= 55 ? "#00d4aa" : stats.winRate >= 45 ? "#4a9eff" : "#ff3366"} sub={`${stats.totalTrades} lukkede trades`} />
              <StatCard label="Snitt vinner" value={`+${stats.avgWin}%`} color="#00d4aa" sub={`Beste: +$${stats.bestTrade.toLocaleString()}`} />
              <StatCard label="Snitt taper" value={`${stats.avgLoss}%`} color="#ff3366" sub={`Verste: $${stats.worstTrade.toLocaleString()}`} />
            </div>

            {/* Insights preview (top 2 critical/warning) */}
            {activeInsights.filter((i) => i.severity === "critical" || i.severity === "warning").length > 0 && (
              <div style={{ marginBottom: "32px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "12px" }}>
                  ⚠ Viktigste innsikter
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {activeInsights
                    .filter((i) => i.severity === "critical" || i.severity === "warning")
                    .slice(0, 2)
                    .map((i) => (
                      <InsightCard key={i.id} insight={i} onDismiss={handleDismiss} />
                    ))}
                </div>
                <button
                  onClick={() => setActiveTab("insights")}
                  style={{
                    marginTop: "12px",
                    background: "none",
                    border: "none",
                    color: "#4a9eff",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontFamily: "inherit",
                    padding: "4px 0",
                  }}
                >
                  Se alle {activeInsights.length} innsikter →
                </button>
              </div>
            )}

            {/* Calendar + Quick stats */}
            <div className="tj-analysis-grid" style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "32px",
            }}>
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "12px",
                padding: "24px",
              }}>
                <CalendarHeatmap trades={trades} />
              </div>
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "12px",
                padding: "24px",
              }}>
                <TimeOfDayChart trades={trades} />
              </div>
            </div>

            {/* Strategy breakdown */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "12px",
              padding: "24px",
            }}>
              <StrategyBreakdown trades={trades} />
            </div>
          </div>
        )}

        {/* ─── INSIGHTS TAB ──────────────────────── */}
        {activeTab === "insights" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {activeInsights.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "rgba(255,255,255,0.3)",
              }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>✨</div>
                <div style={{ fontSize: "16px" }}>Ingen aktive innsikter</div>
                <div style={{ fontSize: "13px", marginTop: "8px" }}>Alle mønster er avvist eller utløpt</div>
              </div>
            ) : (
              activeInsights
                .sort((a, b) => {
                  const order = { critical: 0, warning: 1, info: 2, positive: 3 };
                  return order[a.severity] - order[b.severity];
                })
                .map((i) => <InsightCard key={i.id} insight={i} onDismiss={handleDismiss} />)
            )}
          </div>
        )}

        {/* ─── ANALYSIS TAB ──────────────────────── */}
        {activeTab === "analysis" && (
          <div>
            <div className="tj-analysis-grid" style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "16px",
            }}>
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "12px",
                padding: "24px",
              }}>
                <TimeOfDayChart trades={trades} />
              </div>
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "12px",
                padding: "24px",
              }}>
                <DispositionChart trades={trades} />
              </div>
            </div>

            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "16px",
            }}>
              <StrategyBreakdown trades={trades} />
            </div>

            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "12px",
              padding: "24px",
            }}>
              <CalendarHeatmap trades={trades} />
            </div>
          </div>
        )}

        {/* ─── TRADES TAB ────────────────────────── */}
        {activeTab === "trades" && (
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "12px",
            padding: "24px",
          }}>
            <TradeList trades={trades} />
          </div>
        )}
      </div>
    </div>
  );
}
