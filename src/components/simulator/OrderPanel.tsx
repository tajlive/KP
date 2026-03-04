"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSimulator } from "@/providers/SimulatorProvider";

export function OrderPanel() {
  const { engine } = useSimulator() as { engine: { placeOrder: (order: { id: string; asset: string; side: 'long' | 'short'; size: number; type: 'market' | 'limit'; limitPrice?: number }) => void } };
  const t = useTranslations('trading.orderPanel');
  const [size, setSize] = useState(0.1);
  const [limit, setLimit] = useState("");

  function buyMarket() {
    engine.placeOrder({
      id: crypto.randomUUID(),
      asset: "BTC",
      side: "long",
      size,
      type: "market",
    });
  }

  function sellMarket() {
    engine.placeOrder({
      id: crypto.randomUUID(),
      asset: "BTC",
      side: "short",
      size,
      type: "market",
    });
  }

  function placeLimit(side: "long" | "short") {
    if (!limit) return;

    engine.placeOrder({
      id: crypto.randomUUID(),
      asset: "BTC",
      side,
      size,
      type: "limit",
      limitPrice: Number(limit),
    });

    setLimit("");
  }

  return (
    <div className="bg-white border border-kp-border rounded-xl p-6 shadow-sm space-y-4">
      <h2 className="text-xl font-semibold">{t('title')}</h2>

      <div>
        <label className="text-sm text-kp-dark/70">{t('sizeLabel')}</label>
        <input
          type="number"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="w-full border border-kp-border rounded-lg px-3 py-2 mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={buyMarket}
          className="py-2 bg-kp-blue text-white rounded-lg hover:bg-kp-accent transition"
        >
          {t('buyMarket')}
        </button>

        <button
          onClick={sellMarket}
          className="py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
        >
          {t('sellMarket')}
        </button>
      </div>

      <div>
        <label className="text-sm text-kp-dark/70">{t('limitPrice')}</label>
        <input
          type="number"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          className="w-full border border-kp-border rounded-lg px-3 py-2 mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => placeLimit("long")}
          className="py-2 border border-kp-border rounded-lg hover:bg-kp-light transition"
        >
          {t('buyLimit')}
        </button>

        <button
          onClick={() => placeLimit("short")}
          className="py-2 border border-kp-border rounded-lg hover:bg-kp-light transition"
        >
          {t('sellLimit')}
        </button>
      </div>
    </div>
  );
}
