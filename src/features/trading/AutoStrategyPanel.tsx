"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePrices } from "@/hooks/usePrices";

// ─── Konfigurasjon ───────────────────────────────────────────────────────────

const RISK_MAP = {
  low: { perTrade: 1, label: "Lav" },
  medium: { perTrade: 5, label: "Medium" },
  high: { perTrade: 10, label: "Høy" },
} as const;

type RiskKey = keyof typeof RISK_MAP;

interface SymbolMeta {
  /** Binance-pair (nøkkel i WS-tickers) */
  symbol: string;
  /** Basis-valuta (nøkkel i coin_prices DB) */
  base: string;
  icon: string;
  name: string;
}

// Alle 11 tradable symboler (coin_prices DB + Binance WS)
const SYMBOLS: SymbolMeta[] = [
  { symbol: "BTCUSDT", base: "BTC", icon: "₿", name: "Bitcoin" },
  { symbol: "ETHUSDT", base: "ETH", icon: "⟠", name: "Ethereum" },
  { symbol: "SOLUSDT", base: "SOL", icon: "◎", name: "Solana" },
  { symbol: "BNBUSDT", base: "BNB", icon: "◈", name: "BNB" },
  { symbol: "XRPUSDT", base: "XRP", icon: "◎", name: "XRP" },
  { symbol: "ADAUSDT", base: "ADA", icon: "⬡", name: "Cardano" },
  { symbol: "AVAXUSDT", base: "AVAX", icon: "▲", name: "Avalanche" },
  { symbol: "DOTUSDT", base: "DOT", icon: "●", name: "Polkadot" },
  { symbol: "LINKUSDT", base: "LINK", icon: "⛓", name: "Chainlink" },
  { symbol: "DOGEUSDT", base: "DOGE", icon: "Ð", name: "Dogecoin" },
  { symbol: "MATICUSDT", base: "MATIC", icon: "◆", name: "Polygon" },
];

const DEFAULT_SELECTED = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

type SessionStatus = "idle" | "starting" | "active" | "error";

interface PriceRow {
  price?: number;
  price_change_percent_24h?: number | null;
}

// ─── Komponent ───────────────────────────────────────────────────────────────

export function AutoStrategyPanel() {
  const { prices } = usePrices();
  const [risk, setRisk] = React.useState<RiskKey>("medium");
  const [capital, setCapital] = React.useState("10000");
  const [status, setStatus] = React.useState<SessionStatus>("idle");
  const [message, setMessage] = React.useState("");
  const [checked, setChecked] = React.useState(false);
  const [stopping, setStopping] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>(DEFAULT_SELECTED);
  const [liveMode, setLiveMode] = React.useState(false);
  const [binanceConnected, setBinanceConnected] = React.useState<boolean | null>(null);
  const [binanceTradingPerm, setBinanceTradingPerm] = React.useState(false);
  const activeSessionIdsRef = React.useRef<string[]>([]);

  // 24h endring fra usePrices() — tåler både DB-nøkkel (BTC) og WS-nøkkel (BTCUSDT)
  const changeOf = (meta: SymbolMeta): number | null => {
    const row = (prices[meta.symbol] ?? prices[meta.base]) as PriceRow | undefined;
    const pct = row?.price_change_percent_24h;
    return typeof pct === "number" && Number.isFinite(pct) ? pct : null;
  };

  // Sjekk om det allerede finnes aktive auto-sesjoner ved mount (via /api — server-side auth)
  React.useEffect(() => {
    let cancelled = false;
    async function checkActive() {
      try {
        const res = await fetch("/api/trading/sessions?status=active");
        if (!res.ok) return;
        const data = await res.json();
        const sessions = Array.isArray(data) ? data : (data?.sessions ?? []);
        const ids = (sessions as Array<{ id?: string }>)
          .map((s) => s.id)
          .filter((x): x is string => Boolean(x));
        if (cancelled) return;
        activeSessionIdsRef.current = ids;
        if (ids.length > 0) {
          setStatus("active");
          setMessage(`${ids.length} aktiv sesjon — AI overvåker og handler`);
        }
      } catch {
        // Stille
      } finally {
        if (!cancelled) setChecked(true);
      }
    }
    checkActive();
    return () => { cancelled = true; };
  }, []);

  // Sjekk Binance-tilkobling (for live-toggle)
  React.useEffect(() => {
    let cancelled = false;
    async function checkBinance() {
      try {
        const res = await fetch("/api/exchanges/connections");
        if (!res.ok) { if (!cancelled) setBinanceConnected(false); return; }
        const data = await res.json();
        const conns: Array<{ exchange: string; isActive: boolean; permissions: string[] }> =
          data?.connections ?? [];
        const binance = conns.find(
          (c) => c.exchange === "binance" && c.isActive,
        );
        if (cancelled) return;
        setBinanceConnected(Boolean(binance));
        setBinanceTradingPerm(Boolean(binance?.permissions?.includes("trading")));
      } catch {
        if (!cancelled) setBinanceConnected(false);
      }
    }
    checkBinance();
    return () => { cancelled = true; };
  }, []);

  const toggleSymbol = (symbol: string) => {
    setSelected((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol],
    );
  };

  const startAutoTrade = async () => {
    if (liveMode && !binanceTradingPerm) {
      setStatus("error");
      setMessage("Koble Binance med trading-tillatelse i Innstillinger → Børser først");
      return;
    }
    setStatus("starting");
    setMessage(liveMode ? "Starter live-handel (ekte penger via Binance)..." : "Starter auto-handel...");
    try {
      const res = await fetch("/api/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "auto",
          live: liveMode,
          symbols: selected,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("active");
        setMessage(
          `${liveMode ? "🔥 Live-handel" : "Auto-handel"} aktiv! ${RISK_MAP[risk].label} risiko, ${capital} kr, ${selected.length} valutaer`,
        );
      } else {
        setStatus("error");
        setMessage(data.error || "Kunne ikke starte auto-handel — prøv igjen om litt");
      }
    } catch {
      setStatus("error");
      setMessage("Nettverksfeil — sjekk tilkoblingen og prøv igjen");
    }
  };

  const stopAutoTrade = async () => {
    setStopping(true);
    setMessage("Stopper auto-handel...");
    try {
      let ids = activeSessionIdsRef.current;
      if (ids.length === 0) {
        // Fallback: hent aktive sesjoner på nytt
        const res = await fetch("/api/trading/sessions?status=active");
        if (res.ok) {
          const data = await res.json();
          const sessions = Array.isArray(data) ? data : (data?.sessions ?? []);
          ids = (sessions as Array<{ id?: string }>)
            .map((s) => s.id)
            .filter((x): x is string => Boolean(x));
        }
      }
      if (ids.length === 0) {
        setStatus("idle");
        setMessage("");
        return;
      }
      const results = await Promise.all(
        ids.map((id) =>
          fetch("/api/trading/sessions", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: id, action: "stop" }),
          }),
        ),
      );
      if (results.every((r) => r.ok)) {
        activeSessionIdsRef.current = [];
        setStatus("idle");
        setMessage("Auto-handel stoppet.");
      } else {
        setStatus("error");
        setMessage("Kunne ikke stoppe sesjonen — prøv igjen");
      }
    } catch {
      setStatus("error");
      setMessage("Nettverksfeil — kunne ikke stoppe auto-handel");
    } finally {
      setStopping(false);
    }
  };

  // Lesbar liste av valgte valutaer: "BTC, ETH og SOL"
  const selectedBases = SYMBOLS.filter((s) => selected.includes(s.symbol)).map((s) => s.base);
  const monitoredLabel =
    selectedBases.length <= 2
      ? selectedBases.join(" og ")
      : `${selectedBases.slice(0, -1).join(", ")} og ${selectedBases[selectedBases.length - 1]}`;

  if (!checked) {
    return (
      <div className="space-y-3">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
          Auto-handel — strategi
        </div>
        <div className="bg-[#0A0D12] border border-[#1E2530] rounded-xl p-4 text-center">
          <div className="text-slate-500 text-sm">Sjekker status...</div>
        </div>
      </div>
    );
  }

  const controlsLocked = status === "active" || stopping;

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
        Auto-handel — strategi
      </div>

      <div className="space-y-4 bg-[#0A0D12] border border-[#1E2530] rounded-xl p-4">
        {/* 1. Symbol multi-select */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Valutaer å handle
            </span>
            <span className="text-[10px] font-medium text-amber-400/90 tabular-nums">
              {selected.length} av {SYMBOLS.length} valgt
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Velg valutaer">
            {SYMBOLS.map((s) => {
              const isSelected = selected.includes(s.symbol);
              const change = changeOf(s);
              return (
                <motion.button
                  key={s.symbol}
                  type="button"
                  onClick={() => toggleSymbol(s.symbol)}
                  disabled={controlsLocked}
                  aria-pressed={isSelected}
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-colors",
                    "border-[#1E2530] bg-[#0B0F19]",
                    isSelected
                      ? "border-amber-500/40 bg-amber-500/[0.08]"
                      : "hover:border-slate-600 hover:bg-[#10161F]",
                    controlsLocked && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-md text-[11px]",
                      isSelected ? "bg-amber-500/15 text-amber-400" : "bg-[#141B26] text-slate-400",
                    )}
                  >
                    {s.icon}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={cn(
                        "text-[11px] font-semibold leading-tight",
                        isSelected ? "text-white" : "text-slate-300",
                      )}
                    >
                      {s.base}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-mono leading-tight",
                        change === null
                          ? "text-slate-600"
                          : change >= 0
                            ? "text-emerald-400"
                            : "text-red-400",
                      )}
                    >
                      {change === null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "ml-auto grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[4px] border text-[9px] font-bold",
                      isSelected
                        ? "border-amber-400 bg-amber-400 text-black"
                        : "border-[#2A3547] bg-transparent text-transparent",
                    )}
                  >
                    ✓
                  </span>
                </motion.button>
              );
            })}
          </div>
          {selected.length === 0 && (
            <p className="mt-1.5 text-[10px] text-red-400/90">
              Velg minst én valuta for å starte.
            </p>
          )}
        </div>

        {/* 2. Risikonivå — segmentert (eksisterende design) */}
        <div>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
            Risikonivå
          </span>
          <div className="flex rounded-lg bg-[#0B0F19] border border-[#1E2530] p-0.5">
            {(
              [
                { key: "low", label: "Lav", desc: "1% per trade", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
                { key: "medium", label: "Medium", desc: "5% per trade", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
                { key: "high", label: "Høy", desc: "10% per trade", color: "text-red-400 border-red-500/30 bg-red-500/10" },
              ] as const
            ).map((r) => (
              <button
                key={r.key}
                onClick={() => setRisk(r.key)}
                disabled={controlsLocked}
                className={cn(
                  "flex-1 py-2 text-xs rounded-md transition-all border border-transparent",
                  controlsLocked ? "opacity-50 cursor-not-allowed" : "",
                  risk === r.key ? r.color : "text-slate-500 hover:text-slate-300",
                )}
              >
                <div className="font-bold">{r.label}</div>
                <div className="text-[10px] opacity-70">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Startkapital — eksisterende */}
        <div>
          <label htmlFor="auto-capital" className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
            Startkapital (NOK)
          </label>
          <input
            id="auto-capital"
            type="number"
            value={capital}
            onChange={(e) => setCapital(e.target.value)}
            disabled={controlsLocked}
            className="w-full bg-[#0B0F19] border border-[#1E2530] rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-amber-500 transition-colors disabled:opacity-50"
          />
        </div>

        {/* 4. Modus: Paper vs Live (BYO Binance) */}
        <div>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
            Handelsmodus
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setLiveMode(false)}
              disabled={controlsLocked}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors",
                !liveMode
                  ? "border-amber-500/40 bg-amber-500/[0.08]"
                  : "border-[#1E2530] bg-[#0B0F19] hover:border-slate-600",
                controlsLocked && "opacity-50 cursor-not-allowed",
              )}
            >
              <div className="text-xs font-bold text-white">🧪 Papir</div>
              <div className="text-[10px] text-slate-400">Lekepenger, null risiko</div>
            </button>
            <button
              type="button"
              onClick={() => setLiveMode(true)}
              disabled={controlsLocked}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors",
                liveMode
                  ? "border-emerald-500/40 bg-emerald-500/[0.08]"
                  : "border-[#1E2530] bg-[#0B0F19] hover:border-slate-600",
                controlsLocked && "opacity-50 cursor-not-allowed",
              )}
            >
              <div className="text-xs font-bold text-white">🔥 Live (Binance)</div>
              <div className="text-[10px] text-slate-400">Ekte penger, dine nøkler</div>
            </button>
          </div>

          {liveMode && (
            <div className="mt-1.5 rounded-lg border border-[#1E2530] bg-[#0B0F19] px-3 py-2">
              {binanceConnected === null ? (
                <p className="text-[10px] text-slate-500">Sjekker Binance-tilkobling...</p>
              ) : binanceTradingPerm ? (
                <p className="text-[10px] text-emerald-400">
                  ✅ Binance tilkoblet med trading-tillatelse — klar for live-handel
                </p>
              ) : (
                <p className="text-[10px] text-amber-400">
                  ⚠️ Koble Binance med <b>trading</b>-tillatelse i{" "}
                  <a href="/no/dashboard/settings" className="underline hover:text-amber-300">
                    Innstillinger → Binance API
                  </a>{" "}
                  før live-handel. Nøklene dine krypteres og brukes kun til dine ordrer.
                </p>
              )}
            </div>
          )}
        </div>

        {/* 5. Start / Stopp */}
        <div className="space-y-2">
          <AnimatePresence mode="wait" initial={false}>
            {status === "active" ? (
              <motion.div
                key="running"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-medium py-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Auto-handel kjører — {RISK_MAP[risk].label} risiko
                </div>
                <button
                  onClick={stopAutoTrade}
                  disabled={stopping}
                  className="w-full py-3 rounded-xl text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all disabled:opacity-50"
                >
                  {stopping ? "⏳ Stopper..." : "⏹ Stopp Auto-handel"}
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="start"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                onClick={startAutoTrade}
                disabled={status === "starting" || selected.length === 0}
                className="w-full py-3 rounded-xl text-sm font-bold bg-amber-500 text-black hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {status === "starting" ? "⏳ Starter..." : "🤖 Start Auto-handel"}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {message && (
          <AnimatePresence initial={false}>
            <motion.p
              key={message}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "text-xs text-center",
                status === "error" ? "text-red-400" : "text-emerald-400",
              )}
            >
              {message}
            </motion.p>
          </AnimatePresence>
        )}

        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          AI-en analyserer markedet og plasserer handler basert på din risikoprofil og strategi. Du kan stoppe når som helst.
        </p>
      </div>

      {/* 5. Aktiv sesjon-status */}
      <AnimatePresence initial={false}>
        {status === "active" && (
          <motion.div
            key="active-cards"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* Hva skjer nå? */}
            <div className="bg-[#0A0D12] border border-amber-500/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">Hva skjer nå?</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                AI-en overvåker {monitoredLabel} kontinuerlig. Den sjekker RSI, SMA-crossover og volum for å finne kjøps- og salgsmuligheter. Neste signalsjekk skjer automatisk.
              </p>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span className="text-amber-400/70">⚡</span>
                <span>Sjekker markeder fortløpende — du trenger ikke gjøre noe</span>
              </div>
            </div>

            {/* Aktiv status */}
            <div className="bg-[#0A0D12] border border-[#1E2530] rounded-xl p-4 text-center">
              <p className="text-xs text-emerald-400">● Bot aktiv — overvåker og trader automatisk</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {status !== "active" && (
        <>
          {/* Auto vs Pilot forklaring */}
          <div className="bg-[#0A0D12] border border-[#1E2530] rounded-xl p-3">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <span className="text-amber-400 font-medium">Auto</span> = du velger strategi og risikonivå, AI-en følger reglene.{' '}
              <span className="text-violet-400 font-medium">Pilot</span> = AI-en gjør alt — analyserer, velger markeder og handler. Perfekt hvis du vil ha full autopilot.
            </p>
          </div>

          <div className="bg-[#0A0D12] border border-[#1E2530] rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500">Ingen aktive auto-boter</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Start en bot over for å se status her</p>
          </div>
        </>
      )}
    </div>
  );
}
