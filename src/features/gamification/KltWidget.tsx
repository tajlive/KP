"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/new/AuthContext";
import { useRouter } from "next/navigation";
import { Coins, ArrowRight, Crown, Sparkles } from "lucide-react";

interface KltBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
}

interface SpendingOption {
  id: string;
  name_no: string;
  description_no: string | null;
  cost_klt: number;
  duration_hours: number | null;
}

/**
 * KLT Widget — viser balanse, hva du kan låse opp, og abonnement CTA.
 * Driver konvertering fra gratis → betalende.
 */
export function KltWidget() {
  const { user } = useAuth();
  const router = useRouter();
  const [balance, setBalance] = useState<KltBalance | null>(null);
  const [options, setOptions] = useState<SpendingOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/klt/balance").then((r) => r.json()),
      fetch("/api/klt/spending-options").then((r) => r.json()),
    ])
      .then(([bal, opt]) => {
        if (bal.success) setBalance(bal.data);
        if (opt.success) setOptions(opt.data.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || loading) return null;

  const klt = balance?.balance ?? 500;
  const nextUnlock = options.find((o) => klt >= o.cost_klt);
  const cheapestPaid = options[0];

  return (
    <div className="rounded-2xl border border-[#2A2D35] bg-gradient-to-b from-[#15171B] to-[#0A0B0D] p-5">
      {/* Balanse */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-[#F59E0B]" />
          <span className="font-sans text-sm font-semibold text-[#F9FAFB]">
            Dine KLT
          </span>
        </div>
        <span className="font-mono text-2xl font-extrabold text-[#F59E0B] tabular-nums">
          {klt.toLocaleString("no-NO")}
        </span>
      </div>

      {/* Tjent / Brukt */}
      {balance && (
        <div className="mt-2 flex gap-4 text-xs text-[#6B7280]">
          <span>
            Tjent:{" "}
            <span className="text-[#10B981]">
              +{balance.total_earned.toLocaleString("no-NO")}
            </span>
          </span>
          <span>
            Brukt:{" "}
            <span className="text-[#EF4444]">
              −{balance.total_spent.toLocaleString("no-NO")}
            </span>
          </span>
        </div>
      )}

      {/* Hva kan du låse opp? */}
      {options.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]">
            Lås opp med KLT
          </p>
          {options.map((opt) => {
            const canAfford = klt >= opt.cost_klt;
            const isNext = opt.id === nextUnlock?.id;
            return (
              <button
                key={opt.id}
                onClick={() => router.push("/no/priser")}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs transition-colors ${
                  canAfford
                    ? "border border-[#F59E0B]/20 bg-[#F59E0B]/5 hover:bg-[#F59E0B]/10"
                    : "border border-[#2A2D35] bg-[#15171B]/50 opacity-60"
                }`}
              >
                <div className="flex-1">
                  <span className="font-medium text-[#F9FAFB]">
                    {opt.name_no}
                  </span>
                  {opt.description_no && (
                    <p className="mt-0.5 text-[10px] text-[#6B7280]">
                      {opt.description_no}
                    </p>
                  )}
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <span
                    className={`font-mono text-sm font-bold tabular-nums ${
                      canAfford ? "text-[#F59E0B]" : "text-[#6B7280]"
                    }`}
                  >
                    {opt.cost_klt}
                  </span>
                  <ArrowRight
                    className={`h-3.5 w-3.5 ${
                      canAfford ? "text-[#F59E0B]" : "text-[#4B5563]"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Abonnement CTA — konvertering */}
      <div className="mt-4 rounded-xl border border-[#3B82F6]/20 bg-gradient-to-r from-[#3B82F6]/5 to-[#8B5CF6]/5 p-4">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-[#3B82F6]" />
          <span className="text-sm font-bold text-[#F9FAFB]">
            Unlimited tilgang
          </span>
        </div>
        <p className="mt-1 text-xs text-[#9CA3AF]">
          Ubegrenset Pilot, live trading, og alle premium-kurs.
        </p>
        <button
          onClick={() => router.push("/no/priser")}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#2563EB]"
        >
          <Sparkles className="h-4 w-4" />
          Se abonnement fra 249 kr/mnd
        </button>
      </div>

      {/* Tjen KLT */}
      <p className="mt-3 text-center text-[10px] text-[#6B7280]">
        Tjen KLT ved å lære, trade og invitere venner — eller{" "}
        <button
          onClick={() => router.push("/no/priser")}
          className="text-[#3B82F6] hover:underline"
        >
          oppgrader
        </button>{" "}
        for alt inkludert.
      </p>
    </div>
  );
}
