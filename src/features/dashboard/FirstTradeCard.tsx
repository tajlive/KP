"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BRAND } from "@/lib/design/tokens";
import { toast } from "sonner";

interface FirstTradeCardProps {
  userId: string;
  locale: string;
  hasTrades: boolean;
}

export default function FirstTradeCard({
  locale,
  hasTrades,
}: FirstTradeCardProps) {
  const router = useRouter();
  const tReject = useTranslations("tradeHistory.rejectReason");
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completed, setCompleted] = useState(false);
  const no = locale === "no";

  if (hasTrades) return null;

  const mapRejectionReason = (code: unknown): string | null => {
    if (typeof code !== "string" || !code) return null;
    const known = [
      "NO_RISK_PROFILE",
      "BOT_NOT_HEALTHY",
      "LIVE_NOT_ALLOWED",
      "POSITION_LIMIT_EXCEEDED",
      "EXPOSURE_LIMIT_EXCEEDED",
      "DAILY_LOSS_LIMIT_EXCEEDED",
      "DAILY_LOSS_CHECK_FAILED",
      "PAIR_NOT_ALLOWED",
      "LEVERAGE_NOT_ALLOWED",
      "INSUFFICIENT_BALANCE",
      "SESSION_NOT_ACTIVE",
      "INVALID_TRADING_MODE",
    ];
    if (known.includes(code)) return tReject(code as never);
    return code;
  };

  const handleFirstTrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/paper-trading/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair: "BTCUSDT",
          side: "buy",
          amount_nok: 1000,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error("First trade failed:", data);
        toast.error(
          no ? "Kunne ikke utføre handel" : "Could not execute trade",
          {
            description:
              mapRejectionReason(data?.rejectionReason) ??
              (typeof data?.error === "string" ? data.error : undefined),
          },
        );
        return;
      }
      router.refresh();
      setShowConfetti(true);
      setCompleted(true);
      setTimeout(() => setShowConfetti(false), 4000);
      if (typeof data.session_id === "string" && data.session_id) {
        router.push(`/${locale}/dashboard/trade/${data.session_id}`);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="relative overflow-hidden bg-gradient-to-br from-[#F0F7FF] to-[#E6F0FF] border border-[#0052FF]/20 rounded-2xl p-6">
        {completed ? (
          <div className="text-center py-4">
            <p className="text-3xl mb-2">🎊</p>
            <p className="text-lg font-semibold text-[#1A1D26]">
              {no
                ? "Gratulerer! Du eier nå Bitcoin!"
                : "Congratulations! You now own Bitcoin!"}
            </p>
            <a
              href={`/${locale}/paper-trading`}
              className={`${BRAND.link} text-sm font-medium mt-2 inline-block hover:underline`}
            >
              {no ? "Utforsk flere coins →" : "Explore more coins →"}
            </a>
          </div>
        ) : (
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🎉</span>
              <h3 className="text-lg font-semibold text-[#1A1D26]">
                {no
                  ? "Velkommen! Gjør din første handel"
                  : "Welcome! Make your first trade"}
              </h3>
            </div>
            <p className="text-[#5E6478] text-sm mb-4">
              {no
                ? "Prøv å kjøpe Bitcoin for kr 1 000 med lekepenger. Helt risikofritt!"
                : "Try buying Bitcoin for kr 1,000 with virtual money. Completely risk-free!"}
            </p>
            <button
              onClick={handleFirstTrade}
              disabled={loading}
              className={`${BRAND.primary} font-semibold rounded-xl px-6 py-3 transition-all hover:shadow-[0_4px_12px_rgba(0,82,255,0.3)] disabled:opacity-50`}
            >
              {loading
                ? no
                  ? "Kjøper..."
                  : "Buying..."
                : no
                  ? "⚡ Kjøp BTC for kr 1 000"
                  : "⚡ Buy BTC for kr 1,000"}
            </button>
          </div>
        )}
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-[#0052FF]/5" />
        <div className="absolute -bottom-4 -right-12 w-32 h-32 rounded-full bg-[#0052FF]/5" />
      </div>

      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                backgroundColor: [
                  "#0052FF",
                  "#16A34A",
                  "#F59E0B",
                  "#DC2626",
                  "#8B5CF6",
                ][Math.floor(Math.random() * 5)],
                width: `${6 + Math.random() * 8}px`,
                height: `${6 + Math.random() * 8}px`,
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
