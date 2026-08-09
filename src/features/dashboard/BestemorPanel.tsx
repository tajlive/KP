/**
 * BESTEMOR PANEL — 60 år, lite teknisk kunnskap
 * 
 * Design basert på 20 spørsmål:
 * - Stor tekst (20px+)
 * - Trafikklys (grønn/rød/gul)
 * - «Roboten kjører» først
 * - Gevinst/tap størst (48px)
 * - «Hvorfor?» forklaring
 * - Stor rød STOPP-knapp
 * - Popup ved feil
 * 
 * @module features/dashboard
 * @version 1.0.0
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface BestemorPanelProps {
  sessionId: string;
}

export function BestemorPanel({ sessionId }: BestemorPanelProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const { data, isLoading } = useQuery({
    queryKey: ["bestemor", sessionId],
    queryFn: () => fetch(`/api/trading/max-aggressive`).then(r => r.json()),
    refetchInterval: 1000, // Hvert sekund
  });

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-2xl text-gray-500">Laster...</div>
      </div>
    );
  }

  const { 
    status = "running",
    daily_pnl = 0,
    daily_pnl_kr = 0,
    explanation = "Roboten venter på riktig pris",
    kill_switch = false,
    leverage = 5,
    symbol = "SOL",
  } = data || {};

  const isProfit = daily_pnl >= 0;
  const statusColor = kill_switch ? "bg-red-500" : isProfit ? "bg-green-500" : "bg-yellow-500";
  const statusText = kill_switch ? "🛑 STOPPET" : "🤖 ROBOTEN KJØRER";
  const pnlColor = isProfit ? "text-green-600" : "text-red-600";

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Status øverst — viktigst (svar #1) */}
      <div className={`${statusColor} text-white text-2xl font-bold text-center py-4 rounded-2xl`}>
        {statusText}
      </div>

      {/* Gevinst/tap — størst (svar #10) */}
      <div className="text-center space-y-2">
        <div className="text-xl text-gray-600">Du har {isProfit ? "tjent" : "tapt"}:</div>
        <div className={`text-6xl font-bold ${pnlColor}`}>
          {isProfit ? "+" : ""}{daily_pnl_kr.toFixed(2)} kr
        </div>
        <div className={`text-3xl ${pnlColor}`}>
          ({isProfit ? "+" : ""}{daily_pnl.toFixed(2)}%)
        </div>
      </div>

      {/* Hvorfor? — forklaring (svar #12) */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <div className="text-lg font-medium text-blue-800">Hvorfor?</div>
        <div className="text-xl text-blue-900">{explanation}</div>
      </div>

      {/* Info om strategi — enkel (svar #3, #4) */}
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <div className="text-lg text-gray-700">
          Roboten bruker <strong>{leverage}x</strong> — du kan tjene {leverage} ganger mer,<br />
          men også tape {leverage} ganger mer.
        </div>
        <div className="text-lg text-gray-600 mt-2">
          Den kjøper {symbol} billig og selger dyrt, igjen og igjen.
        </div>
      </div>

      {/* Knapper — 3 stk (svar #8) */}
      <div className="grid grid-cols-3 gap-4">
        {/* Stopp — stor, rød, midt (svar #16) */}
        <button
          onClick={() => fetch(`/api/trading/max-aggressive/stop`, { method: "POST" })}
          className="bg-red-600 hover:bg-red-700 text-white text-2xl font-bold py-6 rounded-2xl transition-colors"
        >
          🛑<br />STOPP
        </button>
        
        {/* Info */}
        <button
          onClick={() => setShowInfo(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white text-2xl font-bold py-6 rounded-2xl transition-colors"
        >
          ℹ️<br />INFO
        </button>
        
        {/* Innstillinger — krever bekreftelse (svar #17) */}
        <button
          onClick={() => setShowSettings(true)}
          className="bg-gray-500 hover:bg-gray-600 text-white text-2xl font-bold py-6 rounded-2xl transition-colors"
        >
          ⚙️<br />INNST.
        </button>
      </div>

      {/* Kill switch varsling — popup (svar #18) */}
      {kill_switch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <div className="text-2xl font-bold text-red-600">ADVARSEL</div>
            <div className="text-xl">
              Roboten har tapt 3% i dag.<br />
              Den stopper automatisk.
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white text-xl font-bold py-3 px-8 rounded-xl"
            >
              OK, jeg forstår
            </button>
          </div>
        </div>
      )}

      {/* Info popup */}
      {showInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 space-y-4">
            <div className="text-2xl font-bold text-center">Hva gjør roboten?</div>
            <div className="text-lg space-y-2">
              <p>🤖 <strong>Roboten kjører:</strong> Den jobber for deg hele dagen.</p>
              <p>💰 <strong>5x:</strong> Du kan tjene 5 ganger mer, men også tape 5 ganger mer.</p>
              <p>🔄 <strong>Grid:</strong> Den kjøper billig og selger dyrt, igjen og igjen.</p>
              <p>🛑 <strong>Stopp:</strong> Den stopper selv hvis den taper 3% i dag.</p>
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="w-full bg-blue-500 text-white text-xl font-bold py-3 rounded-xl"
            >
              Lukk
            </button>
          </div>
        </div>
      )}

      {/* Innstillinger popup — krever bekreftelse */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 space-y-4">
            <div className="text-2xl font-bold text-center">Innstillinger</div>
            <div className="text-lg text-center text-gray-600">
              Endringer krever bekreftelse fra Tom.
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
              Kontakt Tom for å endre innstillinger.
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="w-full bg-gray-500 text-white text-xl font-bold py-3 rounded-xl"
            >
              Lukk
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
