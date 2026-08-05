"use client";

import { useState } from "react";

interface KillSwitchButtonProps {
  onKillSwitch?: () => void;
}

export function KillSwitchButton({ onKillSwitch }: KillSwitchButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleKillSwitch = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/kill-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "manual_admin_trigger" }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(
          `✅ Stoppet! ${data.totalOrdersCancelled} ordre kansellert, ${data.totalSessionsStopped} sesjoner stoppet.`,
        );
        onKillSwitch?.();
      } else {
        setResult(`❌ Feil: ${data.error}`);
      }
    } catch (error) {
      setResult(
        `❌ Nettverksfeil: ${error instanceof Error ? error.message : "Ukjent"}`,
      );
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  return (
    <div className="p-4 bg-red-950/50 border border-red-800 rounded-xl">
      <h3 className="text-lg font-bold text-red-400 mb-2">Nødstopp</h3>
      <p className="text-sm text-red-300 mb-4">
        Stopper ALL trading umiddelbart. Kansellerer alle ordre og deaktiverer
        alle brukere.
      </p>

      {result && (
        <div
          className={`p-3 rounded-lg mb-4 text-sm ${
            result.startsWith("✅")
              ? "bg-green-900/50 text-green-300"
              : "bg-red-900/50 text-red-300"
          }`}
        >
          {result}
        </div>
      )}

      <button
        onClick={handleKillSwitch}
        disabled={loading}
        className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all ${
          confirming
            ? "bg-red-600 hover:bg-red-700 animate-pulse"
            : "bg-red-800 hover:bg-red-900"
        } disabled:opacity-50`}
      >
        {loading
          ? "Stopper..."
          : confirming
            ? "⚠️ BEKREFT: Stopp ALL trading?"
            : "🛑 NØDSTOPP"}
      </button>

      {confirming && (
        <button
          onClick={() => setConfirming(false)}
          className="w-full mt-2 py-2 px-4 rounded-lg text-gray-400 hover:text-white text-sm"
        >
          Avbryt
        </button>
      )}
    </div>
  );
}
