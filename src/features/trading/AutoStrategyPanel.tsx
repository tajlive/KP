"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const RISK_MAP: Record<string, { perTrade: number; label: string }> = {
  low: { perTrade: 1, label: "Lav" },
  medium: { perTrade: 5, label: "Medium" },
  high: { perTrade: 10, label: "Høy" },
};

export function AutoStrategyPanel() {
  const [risk, setRisk] = React.useState("medium");
  const [capital, setCapital] = React.useState("10000");
  const [status, setStatus] = React.useState<"idle" | "starting" | "active" | "error">("idle");
  const [message, setMessage] = React.useState("");
  const [checked, setChecked] = React.useState(false);

  // Sjekk om det allerede finnes aktive auto-sesjoner ved mount (via /api — server-side auth)
  React.useEffect(() => {
    let cancelled = false;
    async function checkActive() {
      try {
        const res = await fetch("/api/trading/sessions?status=active");
        if (!res.ok) return;
        const data = await res.json();
        const sessions = Array.isArray(data) ? data : (data?.sessions ?? []);
        if (cancelled) return;
        if (sessions.length > 0) {
          setStatus("active");
          setMessage(`${sessions.length} aktiv sesjon — AI overvåker og handler`);
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

  const startAutoTrade = async () => {
    setStatus("starting");
    setMessage("Starter auto-handel...");
    try {
      const res = await fetch("/api/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "auto" }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("active");
        setMessage(`Auto-handel aktiv! Risiko: ${RISK_MAP[risk].label}, Kapital: ${capital} kr`);
      } else {
        setStatus("error");
        setMessage(data.error || "Kunne ikke starte auto-handel — prøv igjen om litt");
      }
    } catch {
      setStatus("error");
      setMessage("Nettverksfeil — sjekk tilkoblingen og prøv igjen");
    }
  };

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

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
        Auto-handel — strategi
      </div>

      <div className="space-y-3 bg-[#0A0D12] border border-[#1E2530] rounded-xl p-4">
        <div>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
            Risikonivå
          </span>
          <div className="flex rounded-lg bg-[#0B0F19] border border-[#1E2530] p-0.5">
            {[
              { key: "low", label: "Lav", desc: "1% per trade", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
              { key: "medium", label: "Medium", desc: "5% per trade", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
              { key: "high", label: "Høy", desc: "10% per trade", color: "text-red-400 border-red-500/30 bg-red-500/10" },
            ].map((r) => (
              <button
                key={r.key}
                onClick={() => setRisk(r.key)}
                className={cn(
                  "flex-1 py-2 text-xs rounded-md transition-all border border-transparent",
                  status === "active" ? "opacity-50 cursor-not-allowed" : "",
                  risk === r.key ? r.color : "text-slate-500 hover:text-slate-300",
                )}
              >
                <div className="font-bold">{r.label}</div>
                <div className="text-[10px] opacity-70">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="auto-capital" className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
            Startkapital (NOK)
          </label>
          <input
            id="auto-capital"
            type="number"
            value={capital}
            onChange={(e) => setCapital(e.target.value)}
            disabled={status === "active"}
            className="w-full bg-[#0B0F19] border border-[#1E2530] rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-amber-500 transition-colors disabled:opacity-50"
          />
        </div>

        {status === "active" ? (
          <div className="text-emerald-400 text-xs text-center font-medium py-2">
            ● Auto-handel kjører — {RISK_MAP[risk].label} risiko
          </div>
        ) : (
          <button
            onClick={startAutoTrade}
            disabled={status === "starting"}
            className="w-full py-3 rounded-xl text-sm font-bold bg-amber-500 text-black hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {status === "starting" ? "⏳ Starter..." : "🤖 Start Auto-handel"}
          </button>
        )}

        {message && (
          <p className={status === "error" ? "text-red-400 text-xs text-center" : "text-emerald-400 text-xs text-center"}>
            {message}
          </p>
        )}

        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          AI-en analyserer markedet og plasserer handler basert på din risikoprofil og strategi. Du kan stoppe når som helst.
        </p>
      </div>

      {status === "active" && (
        <>
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
              AI-en overvåker BTC, ETH og SOL kontinuerlig. Den sjekker RSI, SMA-crossover og volum for å finne kjøps- og salgsmuligheter. Neste signalsjekk skjer automatisk.
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
        </>
      )}

      {status !== "active" && (
        <>
          {/* Auto vs Joker forklaring */}
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
