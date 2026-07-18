"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Auto Strategy Panel ───
export function AutoStrategyPanel() {
  const [risk, setRisk] = React.useState("medium");
  const [capital, setCapital] = React.useState("10000");

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
        Auto-handel — strategi
      </div>

      <div className="space-y-3 bg-[#0A0D12] border border-[#1E2530] rounded-xl p-4">
        <div>
          <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
            Risikonivå
          </label>
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
            className="w-full bg-[#0B0F19] border border-[#1E2530] rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
        <button className="w-full py-3 rounded-xl text-sm font-bold bg-amber-500 text-black hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20">
          🤖 Start Auto-handel
        </button>
        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          AI-en analyserer markedet og plasserer handler basert på din risikoprofil og strategi. Du kan stoppe når som helst.
        </p>
      </div>
      <div className="bg-[#0A0D12] border border-[#1E2530] rounded-xl p-4 text-center">
        <p className="text-xs text-slate-500">Ingen aktive auto-boter</p>
        <p className="text-[10px] text-slate-600 mt-0.5">Start en bot over for å se status her</p>
      </div>
    </div>
  );
}
