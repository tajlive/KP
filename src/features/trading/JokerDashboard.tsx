"use client";

import * as React from "react";

export function JokerDashboard() {
  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
        JokerTrade — AI styrer
      </div>

      <div className="bg-gradient-to-br from-violet-950/40 to-violet-900/20 border border-violet-500/20 rounded-xl p-5 text-center space-y-4">
        <div className="text-4xl">🃏</div>
        <div>
          <h3 className="text-white font-bold text-lg">AI Trader</h3>
          <p className="text-violet-300/70 text-xs mt-1">
            Overvåker markeder, velger handler og utfører automatisk
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-[#0A0D12] rounded-lg p-3">
            <div className="text-violet-400 text-lg font-bold font-mono">24/7</div>
            <div className="text-[10px] text-slate-500">Overvåkning</div>
          </div>
          <div className="bg-[#0A0D12] rounded-lg p-3">
            <div className="text-violet-400 text-lg font-bold font-mono">5</div>
            <div className="text-[10px] text-slate-500">Markeder</div>
          </div>
        </div>

        <button className="w-full py-3 rounded-xl text-sm font-bold bg-violet-500 text-white hover:bg-violet-400 transition-all shadow-lg shadow-violet-500/20">
          🎭 Start JokerTrade
        </button>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          AI-en gjør alt. Perfekt for deg med lite tid — len deg tilbake og følg med.
        </p>
      </div>

      <div className="bg-[#0A0D12] border border-[#1E2530] rounded-xl p-4">
        <p className="text-xs text-slate-500 text-center">Ingen handler ennå</p>
        <p className="text-[10px] text-slate-600 text-center mt-0.5">Aktiver JokerTrade for å starte</p>
      </div>
    </div>
  );
}
