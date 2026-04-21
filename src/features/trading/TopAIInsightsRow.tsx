"use client";

import { useEffect, useState } from "react";
import { ConfluentSignalCard, ConfluentSignalCardSkeleton } from "@/features/signals/ConfluentSignalCard";
import type { ConfluentSignal } from "@/lib/trading/confluent-signal-engine";
import { Sparkles, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface SignalResponse extends ConfluentSignal {
  _meta?: {
    symbol: string;
    error?: string;
  };
}

export function TopAIInsightsRow() {
  const [btcSignal, setBtcSignal] = useState<SignalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("trading.desk");

  useEffect(() => {
    async function fetchSignals() {
      try {
        setLoading(true);
        // Fetch BTC signal
        const btcRes = await fetch("/api/signal/current?symbol=BTC&strategy=multisignal_aktiv");
        if (btcRes.ok) {
          const data = await btcRes.json();
          setBtcSignal(data);
        }
      } catch (err) {
        console.error("Failed to fetch AI insights", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSignals();
  }, []);

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h2 className="text-lg font-semibold text-white">
          {t("liveAiInsights")}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {loading ? (
          <ConfluentSignalCardSkeleton className="w-full" />
        ) : btcSignal && !btcSignal._meta?.error ? (
          <ConfluentSignalCard
            signal={btcSignal}
            symbol={btcSignal._meta?.symbol || "BTC"}
            timeframe="medium"
            className="w-full border-purple-500/20 bg-slate-800/80"
          />
        ) : (
          <div className="bg-slate-800/80 rounded-xl p-6 flex flex-col items-center justify-center text-center border border-slate-700 h-[240px]">
            <AlertCircle className="w-8 h-8 text-slate-500 mb-2" />
            <p className="text-slate-400 text-sm">{t("sonarLoadError")}</p>
          </div>
        )}
        
        {/* Placeholder for second asset, e.g. ETH, leaving it static here to save API limits initially, or showing gamification context */}
        <div className="bg-slate-800/50 rounded-xl p-6 flex flex-col items-center justify-center border border-slate-700/50 border-dashed">
          <Sparkles className="w-8 h-8 text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">{t("upgradeForMore")}</p>
          <p className="text-slate-500 text-xs mt-1 max-w-[200px] text-center">{t("upgradeDesc")}</p>
        </div>
      </div>
    </div>
  );
}
