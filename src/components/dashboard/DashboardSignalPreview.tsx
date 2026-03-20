"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Radio, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { CARD, BRAND } from "@/lib/design/tokens";

interface TradingSignal {
  id: string;
  symbol: string;
  action: string | null;
  confidence: number | null;
  created_at: string | null;
}

interface DashboardSignalPreviewProps {
  locale: string;
  no: boolean;
}

export function DashboardSignalPreview({
  locale,
  no,
}: DashboardSignalPreviewProps) {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();

    const fetchSignals = async () => {
      try {
        const { data } = await supabase
          .from("trading_signals")
          .select("id, symbol, action, confidence, created_at")
          .order("created_at", { ascending: false })
          .limit(3);

        if (mounted) setSignals((data as TradingSignal[]) ?? []);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSignals();

    const channel = supabase
      .channel("dashboard-signal-preview")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trading_signals" },
        () => {
          if (mounted) fetchSignals();
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className={`${CARD.hover.replace("p-6", "p-5")} animate-pulse`}>
        <div className="h-5 w-32 bg-[#E2E5EC] rounded mb-3" />
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-[#E2E5EC]/60 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const cardBase = CARD.hover.replace("p-6", "p-5");

  return (
    <div className={`${cardBase} animate-fade-in-up stagger-2`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#16A34A]" />
          <h3 className="text-lg font-semibold text-[#1A1D26]">
            {no ? "Siste signaler" : "Latest signals"}
          </h3>
          {signals.length > 0 && (
            <span className="text-[10px] bg-[#16A34A]/10 text-[#16A34A] px-2 py-0.5 rounded-full font-medium">
              Live
            </span>
          )}
        </div>
        <Link
          href={`/${locale}/paper-trading`}
          className={`text-sm font-medium ${BRAND.link}`}
        >
          {no ? "Se alle" : "See all"}
        </Link>
      </div>

      {signals.length === 0 ? (
        <p className="text-sm text-[#8E95A9] py-2">
          {no
            ? "Ingen signaler ennå. Aktiver en strategi for å se signaler."
            : "No signals yet. Enable a strategy to see signals."}
        </p>
      ) : (
        <ul className="space-y-2">
          {signals.map((s) => {
            const isBuy =
              s.action?.toUpperCase() === "BUY" ||
              s.action?.toUpperCase() === "LONG";
            return (
              <li
                key={s.id}
                className="flex items-center justify-between py-2 border-b border-[#E2E5EC]/50 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isBuy
                        ? "bg-[#16A34A]/10 text-[#16A34A]"
                        : "bg-[#DC2626]/10 text-[#DC2626]"
                    }`}
                  >
                    {isBuy ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1D26]">
                      {s.symbol} ·{" "}
                      {isBuy ? (no ? "Kjøp" : "Buy") : no ? "Salg" : "Sell"}
                    </p>
                    {s.confidence != null && (
                      <p className="text-xs text-[#8E95A9]">
                        {s.confidence}% {no ? "konfidens" : "confidence"}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
