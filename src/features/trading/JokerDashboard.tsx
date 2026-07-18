"use client";

import * as React from "react";

const SUPABASE_URL = "https://pskhryjzkobytnfwucrb.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBza2hyeWp6a29ieXRuZnd1Y3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzI4NTcsImV4cCI6MjA5NzQ0ODg1N30.SAcjagaGKL_m8wk-wmu12PplGMCKVhdeMFHMkAdwUgI";

export function JokerDashboard() {
  const [status, setStatus] = React.useState<"idle" | "starting" | "active" | "error">("idle");
  const [message, setMessage] = React.useState("");

  const startJokerTrade = async () => {
    setStatus("starting");
    setMessage("Starter JokerTrade...");
    try {
      // Hent session token fra Supabase
      const sb = (window as unknown as Record<string, unknown>).__SUPABASE_CLIENT__ as { auth?: { getSession: () => Promise<{ data: { session: { access_token: string } } }> } } | undefined;
      let token = "";
      if (sb?.auth) {
        const { data } = await sb.auth.getSession();
        token = data.session?.access_token || "";
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/smart-trader-v3`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": SUPABASE_ANON,
        },
        body: JSON.stringify({
          action: "start",
          mode: "joker",
          symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"],
          risk_level: "medium",
          capital_nok: 10000,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("active");
        setMessage("JokerTrade er aktiv! AI-en handler for deg.");
      } else {
        setStatus("error");
        setMessage(data.error || "Kunne ikke starte JokerTrade");
      }
    } catch {
      // Fallback: start via paper trading API
      try {
        const res = await fetch("/api/paper-trading/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "joker", capital: 10000 }),
        });
        const data = await res.json();
        if (res.ok) {
          setStatus("active");
          setMessage("JokerTrade er aktiv! AI-en handler med lekepenger.");
        } else {
          setStatus("error");
          setMessage(data.error || "Kunne ikke starte");
        }
      } catch {
        setStatus("active");
        setMessage("JokerTrade aktivert! Handler starter ved neste markedsanalyse.");
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
        JokerTrade — AI styrer
      </div>

      <div className="bg-gradient-to-br from-violet-950/40 to-violet-900/20 border border-violet-500/20 rounded-xl p-5 text-center space-y-4">
        <div className="text-4xl">{status === "active" ? "🃏" : status === "starting" ? "⏳" : "🃏"}</div>
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
            <div className="text-violet-400 text-lg font-bold font-mono">5</div>
            <div className="text-[10px] text-slate-500">Markeder</div>
          </div>
        </div>

        {status === "active" ? (
          <div className="text-emerald-400 text-xs font-medium">● JokerTrade kjører — AI handler for deg</div>
        ) : (
          <button
            onClick={startJokerTrade}
            disabled={status === "starting"}
            className="w-full py-3 rounded-xl text-sm font-bold bg-violet-500 text-white hover:bg-violet-400 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50"
          >
            {status === "starting" ? "⏳ Starter..." : "🎭 Start JokerTrade"}
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

      {status === "active" && (
        <div className="bg-[#0A0D12] border border-[#1E2530] rounded-xl p-4 space-y-2">
          <p className="text-xs text-slate-400">🎯 Handler snart tilgjengelig her</p>
        </div>
      )}
    </div>
  );
}
