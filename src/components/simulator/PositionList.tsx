"use client";

import { useTranslations } from "next-intl";
import { useSimulator } from "@/providers/SimulatorProvider";
import type { Position } from "@/lib/simulator/engine";

export function PositionList() {
  const { engine, state } = useSimulator() as { engine: { closePosition: (id: string) => void }; state: { positions: Position[] } };
  const t = useTranslations('trading.positions');

  function close(id: string) {
    engine.closePosition(id);
  }

  return (
    <div className="bg-white border border-kp-border rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">{t('title')}</h2>

      {state.positions.length === 0 && (
        <p className="text-kp-dark/60">{t('empty')}</p>
      )}

      <div className="space-y-3">
        {state.positions.map((p: Position) => (
          <div
            key={p.id}
            className="border border-kp-border rounded-lg p-3 flex justify-between items-center"
          >
            <div>
              <div className="font-semibold">{p.asset}</div>
              <div className="text-sm text-kp-dark/70">
                {p.side === "long" ? t('buy') : t('sell')} @ {p.entry}
              </div>
              <div
                className={`text-sm ${
                  p.pnl >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {p.pnl.toFixed(2)}%
              </div>
            </div>

            <button
              onClick={() => close(p.id)}
              className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              {t('close')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
