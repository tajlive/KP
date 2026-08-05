"use client";

import * as React from "react";

export function PilotDashboard() {
  const [status, setStatus] = React.useState<"idle" | "starting" | "active" | "error">("idle");
  const [message, setMessage] = React.useState("");
  const [checked, setChecked] = React.useState(false);
  const [symbols, setSymbols] = React.useState<string[]>(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "DOTUSDT", "UNIUSDT", "POLUSDT"]);
  const [capitalNok, setCapitalNok] = React.useState(10000);

  // Hent kapital fra paper-API (server-side auth — browser-supabase er anon)
  React.useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/paper-trading/balance");
        if (!res.ok) return;
        const data = await res.json();
        const balance = Number(data?.balance ?? data?.current_balance ?? 0);
        if (balance > 0) setCapitalNok(Math.round(balance));
      } catch { /* stille */ }
    }
    loadConfig();
  }, []);

  // Sjekk om det allerede finnes aktive sesjoner ved mount (via /api — server-side auth)
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
        // Stille — ikke forstyrr brukeren hvis API er utilgjengelig
      } finally {
        if (!cancelled) setChecked(true);
      }
    }
    checkActive();
    return () => { cancelled = true; };
  }, []);

  const startPilotTrade = async () => {
    setStatus("starting");
    setMessage("Starter PilotTrade...");
    try {
      // Server-side engine-rute: sikrer aktiv sesjon + kjører ensemble nå.
      // (Direkte kall til smart-trader-v3 er umulig — den er cron-only og
      // svarer dessuten uten CORS-headere, så nettleseren blokkerer den.)
      const res = await fetch("/api/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "pilot" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("active");
        setMessage("PilotTrade er aktiv! AI-en handler for deg.");
      } else {
        setStatus("error");
        setMessage(data.error || "Kunne ikke starte PilotTrade — prøv igjen om litt");
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
          PilotTrade — AI styrer
        </div>
        <div className="bg-gradient-to-br from-violet-950/40 to-violet-900/20 border border-violet-500/20 rounded-xl p-5 text-center">
          <div className="text-slate-500 text-sm">Sjekker status...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
        PilotTrade — AI styrer
      </div>

      <div className="bg-gradient-to-br from-violet-950/40 to-violet-900/20 border border-violet-500/20 rounded-xl p-5 text-center space-y-4">
        <div className="text-4xl">
          {status === "active" ? "🃏" : status === "starting" ? "⏳" : "🃏"}
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">
            {status === "active" ? "AI Trader aktiv" : status === "starting" ? "Starter..." : "AI Trader"}
          </h3>
          <p className="text-violet-300/70 text-xs mt-1">
            {status === "active"
              ? "Analyserer markeder og plasserer handler automatisk"
              : "Overvåker markeder, velger handler og utfører automatisk"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-[#0A0D12] rounded-lg p-3">
            <div className="text-violet-400 text-lg font-bold font-mono">
              {status === "active" ? "LIVE" : "24/7"}
            </div>
            <div className="text-[10px] text-slate-500">Overvåkning</div>
          </div>
          <div className="bg-[#0A0D12] rounded-lg p-3">
            <div className="text-violet-400 text-lg font-bold font-mono">{symbols.length}</div>
            <div className="text-[10px] text-slate-500">Markeder</div>
          </div>
        </div>

        {status === "active" ? (
          <div className="text-emerald-400 text-xs font-medium">● PilotTrade kjører — AI handler for deg</div>
        ) : (
          <button
            onClick={startPilotTrade}
            disabled={status === "starting"}
            className="w-full py-3 rounded-xl text-sm font-bold bg-violet-500 text-white hover:bg-violet-400 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50"
          >
            {status === "starting" ? "⏳ Starter..." : "🎭 Start PilotTrade"}
          </button>
        )}

        {message && (
          <p className={status === "error" ? "text-red-400 text-xs" : "text-emerald-400 text-xs"}>
            {message}
          </p>
        )}

        <p className="text-[11px] text-slate-500 leading-relaxed">
          AI-en gjør alt. Perfekt for deg med lite tid — len deg tilbake og følg med.
        </p>
      </div>

      {/* Slik fungerer det — alltid synlig */}
      <details className="group bg-[#0A0D12] border border-[#1E2530] rounded-xl overflow-hidden">
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#111620] transition-colors">
          <span className="text-xs font-medium text-slate-400">🧠 Slik fungerer PilotTrade</span>
          <span className="text-slate-500 text-xs group-open:rotate-90 transition-transform">▶</span>
        </summary>
        <div className="px-4 pb-4 space-y-3 text-xs text-slate-400 leading-relaxed border-t border-[#1E2530] pt-3">
          <div>
            <div className="text-violet-400 font-medium mb-1">📊 {symbols.length} markeder overvåkes</div>
            <p>{symbols.map(s => s.replace("USDT","")).join(" · ")}</p>
            <p className="text-slate-500 mt-0.5">Flere markeder = flere muligheter. Boten kjøper og selger automatisk på alle samtidig.</p>
          </div>
          <div>
            <div className="text-amber-400 font-medium mb-1">🎯 Hvordan den tjener penger</div>
            <p>Plasserer kjøps- og salgsordre på mange prisnivåer samtidig. Kjøper når prisen faller, selger når den stiger. Du tjener på svingninger, ikke retning.</p>
          </div>
          <div>
            <div className="text-emerald-400 font-medium mb-1">🛡️ Risikostyring</div>
            <p>Maks {capitalNok.toLocaleString("nb-NO")} kr eksponering · 5% stoploss per trade · Sprer risiko på tvers av markeder</p>
          </div>
          <div>
            <div className="text-blue-400 font-medium mb-1">⏱️ Når handles det?</div>
            <p>Boten handler automatisk døgnet rundt. Hver gang prisen treffer et av våre nivåer, kjøper eller selger den. Du ser alle handler i historikken.</p>
          </div>
        </div>
      </details>

      {status === "active" && (
        <>
          {/* Hva skjer nå? */}
          <div className="bg-[#0A0D12] border border-violet-500/20 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
              </span>
              <span className="text-[11px] font-medium text-violet-400 uppercase tracking-wider">Hva skjer nå?</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Boten overvåker {symbols.length} markeder: {symbols.map(s => s.replace("USDT","")).join(", ")}.{' '}
              Den kjøper automatisk når prisen faller til våre nivåer, og selger når den stiger igjen. Du trenger ikke gjøre noe — det skjer automatisk, døgnet rundt.
            </p>
          </div>

          {/* Aktiv status */}
          <div className="bg-[#0A0D12] border border-[#1E2530] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-emerald-400 font-medium">Aktiv</span>
            </div>
            <p className="text-xs text-slate-400">🎯 Handler vises i historikken fortløpende</p>
          </div>
        </>
      )}
    </div>
  );
}
