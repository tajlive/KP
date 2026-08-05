"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { OnboardingStickyFooter } from "@/features/onboarding/OnboardingStickyFooter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import {
  Bitcoin,
  Info,
  ShoppingCart,
  CheckCircle2,
  PartyPopper,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Wallet,
  Zap,
} from "lucide-react";
import { KrakenConnect } from "@/features/onboarding/KrakenConnect";

export const dynamic = "force-dynamic";

const TRADE_AMOUNT = 1000;
const SYMBOL = "BTCUSDT";

interface TradeResult {
  tradeId: string;
  executionPrice: number;
  symbol: string;
  amount: number;
}

async function fetchBtcPrice(): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${SYMBOL}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { price?: string };
    const price = data.price ? parseFloat(data.price) : null;
    return price && Number.isFinite(price) ? price : null;
  } catch {
    return null;
  }
}

const triggerConfetti = async () => {
  if (typeof window === "undefined") return;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (prefersReducedMotion) return;

  try {
    const { default: confetti } = await import("canvas-confetti");

    // First burst
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.5 },
      colors: ["#F59E0B", "#FCD34D", "#F9FAFB", "#10B981", "#3B82F6"],
      disableForReducedMotion: true,
    });

    // Second burst after a short delay
    setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 120,
        origin: { y: 0.4, x: 0.3 },
        colors: ["#F59E0B", "#FCD34D", "#10B981"],
        disableForReducedMotion: true,
      });
    }, 400);

    // Third burst from other side
    setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 120,
        origin: { y: 0.4, x: 0.7 },
        colors: ["#F59E0B", "#FCD34D", "#3B82F6"],
        disableForReducedMotion: true,
      });
    }, 800);
  } catch {
    // ignore
  }
};

export default function OnboardingStep4FirstTrade() {
  const locale = useLocale();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [paperBalance, setPaperBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tradeResult, setTradeResult] = useState<TradeResult | null>(null);
  const [showTooltip, setShowTooltip] = useState<"price" | "balance" | "trade" | null>("balance");
  const [showKrakenConnect, setShowKrakenConnect] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Check status
  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      try {
        // KLA-auth: browser-klienten er alltid anon — onboarding-state
        // hentes via server-API som leser httpOnly auth-cookie
        const res = await fetch("/api/user/onboarding", {
          credentials: "same-origin",
        });
        if (res.status === 401) {
          router.push(`${hrefWithLocale(locale, "/login")}?next=${encodeURIComponent(`/${locale}/onboarding/step4-first-trade`)}`);
          return;
        }
        const json = await res.json().catch(() => null);
        const profile = json?.onboarding;

        if (profile?.onboarding_completed) {
          router.push(`/${locale}/dashboard`);
          return;
        }

        const step = profile?.onboarding_step ?? 0;

        if (step === 0) {
          router.push(`/${locale}/onboarding/step1-welcome`);
          return;
        }
        if (step === 1) {
          router.push(`/${locale}/onboarding/step2-level`);
          return;
        }

        if (mounted) {
          setPaperBalance(Number(profile?.paper_balance) || 100000);
          setUserId(profile?.user_id || null);
          setChecking(false);
        }
      } catch {
        if (mounted) setChecking(false);
      }
    };
    checkStatus();
    return () => { mounted = false; };
  }, [router, locale]);

  // Fetch BTC price
  useEffect(() => {
    if (checking) return;

    let mounted = true;
    const loadPrice = async () => {
      const price = await fetchBtcPrice();
      if (mounted) setBtcPrice(price);
    };

    loadPrice();
    const interval = setInterval(loadPrice, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [checking]);

  // Sequential tooltip guide
  useEffect(() => {
    if (checking || success) return;

    const timers = [
      setTimeout(() => setShowTooltip("balance"), 500),
      setTimeout(() => setShowTooltip("price"), 2500),
      setTimeout(() => setShowTooltip("trade"), 4500),
    ];

    return () => timers.forEach(clearTimeout);
  }, [checking, success]);

  const handleBuy = useCallback(async () => {
    if (loading || success) return;
    setLoading(true);

    try {
      // Try API first
      const res = await fetch("/api/onboarding/first-paper-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: TRADE_AMOUNT }),
      });

      if (res.ok) {
        const data = (await res.json()) as TradeResult;
        setTradeResult(data);
      } else {
        // Fallback: Simuler trade lokalt
        setTradeResult({
          tradeId: crypto.randomUUID(),
          executionPrice: btcPrice ?? 65000,
          symbol: "BTCUSDT",
          amount: TRADE_AMOUNT,
        });
      }

      // Fullfør onboarding via server-API
      await fetch("/api/user/onboarding", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboarding_step: 3,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        }),
      }).catch(() => {
        // Ikke-blokkerende — konfetti skal vises uansett
      });

      setSuccess(true);
      setLoading(false);

      // Konfetti!
      setTimeout(() => void triggerConfetti(), 200);
    } catch {
      setLoading(false);
    }
  }, [loading, success, btcPrice]);

  const handleGoToDashboard = () => {
    router.push(`/${locale}/dashboard`);
  };

  const handleKrakenSuccess = () => {
    setShowKrakenConnect(false);
    // Refresh onboarding state
    window.location.reload();
  };

  const handleKrakenError = (error: string) => {
    console.error("Kraken connect error:", error);
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#F59E0B]" />
      </div>
    );
  }

  // ── Success State ──
  if (success && tradeResult) {
    return (
      <TooltipProvider>
        <div className="min-h-full flex flex-col gap-6 items-center text-center">
          {/* Progress: 3/3 fullført */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#F59E0B] font-medium">Steg 3 av 3</span>
              <span className="text-[#10B981]">✓ Fullført</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#1A1D26] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] via-[#FCD34D] to-[#10B981]"
                initial={{ width: "66%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Success animation */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-[#10B981]/20 to-[#059669]/10 border border-[#10B981]/30 flex items-center justify-center"
          >
            <PartyPopper className="w-12 h-12 text-[#F59E0B]" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-2"
          >
            <h1 className="text-2xl font-bold text-[#F9FAFB]">
              Gratulerer! 🎉
            </h1>
            <p className="text-[#9CA3AF] max-w-xs mx-auto">
              Du har gjort din første handel. Nå er du klar til å utforske dashboardet.
            </p>
          </motion.div>

          {/* Trade summary */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="w-full rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-5 space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#9CA3AF]">Handel</span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-[#F9FAFB]">
                <Bitcoin className="w-4 h-4 text-[#F59E0B]" />
                Kjøp BTC
              </span>
            </div>
            <div className="h-px bg-[#2A2D35]" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#9CA3AF]">Beløp</span>
              <span className="text-sm font-semibold text-[#F9FAFB]">1 000 kr</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#9CA3AF]">Pris</span>
              <span className="text-sm font-semibold text-[#F9FAFB]">
                ${tradeResult.executionPrice.toLocaleString(locale, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#9CA3AF]">Saldo igjen</span>
              <span className="text-sm font-semibold text-[#10B981]">
                {(paperBalance - TRADE_AMOUNT).toLocaleString(locale)} kr
              </span>
            </div>
          </motion.div>

          {/* Kraken connect button */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="w-full"
          >
            <button
              onClick={() => setShowKrakenConnect(true)}
              className="w-full rounded-2xl border border-[#F59E0B]/30 bg-gradient-to-r from-[#F59E0B]/10 to-[#FCD34D]/5 p-4 text-left hover:border-[#F59E0B]/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#F9FAFB]">Koble til Kraken</p>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">
                    For ekte penger — automatisk trading
                  </p>
                </div>
              </div>
            </button>
          </motion.div>

          {/* What's next */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="w-full rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/40 backdrop-blur-xl p-4"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-medium text-[#F9FAFB]">Du er klar!</p>
                <p className="text-xs text-[#6B7280] mt-1">
                  Utforsk dashboardet for å se porteføljen din, følg med på markeder,
                  og oppdag auto-trading med SmartTrader.
                </p>
              </div>
            </div>
          </motion.div>

          <OnboardingStickyFooter>
            <Button
              onClick={handleGoToDashboard}
              className="w-full h-12 text-base font-semibold rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#FCD34D] text-[#0A0B0D] hover:from-[#D97706] hover:to-[#F59E0B] active:scale-[0.98] transition-all shadow-lg shadow-[#F59E0B]/20"
            >
              <span className="flex items-center justify-center gap-2">
                Gå til dashboard <ArrowRight className="w-4 h-4" />
              </span>
            </Button>
          </OnboardingStickyFooter>
        </div>

        {/* Kraken Connect Modal */}
        {showKrakenConnect && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative max-w-md w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0A0B0D] border border-[#2A2D35]">
              <button
                onClick={() => setShowKrakenConnect(false)}
                className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#F9FAFB] z-10"
              >
                ✕
              </button>
              <KrakenConnect
                userId={userId || ""}
                onSuccess={handleKrakenSuccess}
                onError={handleKrakenError}
              />
            </div>
          </div>
        )}
      </TooltipProvider>
    );
  }

  // ── Trade State ──
  return (
    <TooltipProvider>
      <div className="min-h-full flex flex-col gap-6">
        {/* Progress: 3/3 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#F59E0B] font-medium">Steg 3 av 3</span>
            <span className="text-[#6B7280]">Din første handel</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#1A1D26] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] via-[#FCD34D] to-[#F59E0B]"
              initial={{ width: "66%" }}
              animate={{ width: "85%" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F59E0B]/20 to-[#FCD34D]/10 border border-[#F59E0B]/20 mb-1">
            <Bitcoin className="w-7 h-7 text-[#F59E0B]" />
          </div>
          <h1 className="text-2xl font-bold text-[#F9FAFB]">
            Din første handel
          </h1>
          <p className="text-[#9CA3AF] text-sm max-w-xs mx-auto">
            La oss gjøre din første handel — trykk på knappen for å kjøpe BTC
          </p>
        </div>

        {/* Balanse og pris kort */}
        <div className="grid grid-cols-2 gap-3">
          {/* Balanse kort */}
          <div className="relative rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#9CA3AF] mb-2">
              <Wallet className="w-3.5 h-3.5" />
              Din saldo
              <Tooltip open={showTooltip === "balance"} onOpenChange={() => setShowTooltip(null)}>
                <TooltipTrigger asChild>
                  <button className="inline-flex" onClick={() => setShowTooltip("balance")}>
                    <Info className="w-3.5 h-3.5 text-[#6B7280]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-[#1A1D26] border border-[#2A2D35] text-xs text-[#D1D5DB] max-w-[200px]">
                  <p>Dette er lekepenger du valgte i steg 2 — kun virtuell valuta for øving</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-xl font-bold text-[#F9FAFB]">
              {paperBalance.toLocaleString(locale)} kr
            </span>
          </div>

          {/* Pris kort */}
          <div className="relative rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#9CA3AF] mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              BTC pris
              <Tooltip open={showTooltip === "price"} onOpenChange={() => setShowTooltip(null)}>
                <TooltipTrigger asChild>
                  <button className="inline-flex" onClick={() => setShowTooltip("price")}>
                    <Info className="w-3.5 h-3.5 text-[#6B7280]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-[#1A1D26] border border-[#2A2D35] text-xs text-[#D1D5DB] max-w-[200px]">
                  <p>Live pris fra Binance — prisen oppdateres automatisk hvert 30. sekund</p>
                </TooltipContent>
              </Tooltip>
            </div>
            {btcPrice ? (
              <span className="text-xl font-bold text-[#F9FAFB]">
                ${btcPrice.toLocaleString(locale, { maximumFractionDigits: 2 })}
              </span>
            ) : (
              <span className="text-xl font-bold text-[#6B7280]">—</span>
            )}
          </div>
        </div>

        {/* Handle-kort */}
        <div className="relative rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-5 text-center">
          <Tooltip open={showTooltip === "trade"} onOpenChange={() => setShowTooltip(null)}>
            <TooltipTrigger asChild>
              <h2 className="text-sm font-semibold text-[#F9FAFB] mb-1 flex items-center justify-center gap-1.5 cursor-help">
                Kjøp Bitcoin
                <Info className="w-3.5 h-3.5 text-[#F59E0B]" />
              </h2>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#1A1D26] border border-[#2A2D35] text-xs text-[#D1D5DB] max-w-[220px]">
              <p>Du kjøper BTC for 1 000 kr i lekepenger. Handelen simuleres som en market order til gjeldende pris.</p>
            </TooltipContent>
          </Tooltip>

          <div className="flex items-center justify-center gap-3 my-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F59E0B]/20 to-[#FCD34D]/10 flex items-center justify-center">
              <Bitcoin className="w-6 h-6 text-[#F59E0B]" />
            </div>
            <ArrowRight className="w-5 h-5 text-[#6B7280]" />
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10B981]/20 to-[#059669]/10 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-[#10B981]" />
            </div>
          </div>

          <p className="text-3xl font-bold text-[#F9FAFB]">
            1 000 <span className="text-lg font-normal text-[#9CA3AF]">kr</span>
          </p>
          <p className="text-xs text-[#6B7280] mt-2">
            Market order · BTC/USDT · Lekepenger
          </p>

          {/* Hva skjer når du trykker */}
          <div className="mt-4 space-y-2 text-left">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <span className="text-xs text-[#9CA3AF]">1 000 kr trekkes fra saldoen din</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <span className="text-xs text-[#9CA3AF]">Du mottar BTC til gjeldende markedspris</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <span className="text-xs text-[#9CA3AF]">Handelen vises i dashboardet ditt</span>
            </div>
          </div>
        </div>

        <OnboardingStickyFooter>
          <Button
            onClick={handleBuy}
            disabled={loading}
            loading={loading}
            className="w-full h-12 text-base font-semibold rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#FCD34D] text-[#0A0B0D] hover:from-[#D97706] hover:to-[#F59E0B] active:scale-[0.98] transition-all shadow-lg shadow-[#F59E0B]/20"
          >
            {loading ? (
              "Gjennomfører..."
            ) : (
              <span className="flex items-center justify-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Kjøp BTC for 1 000 kr
              </span>
            )}
          </Button>
        </OnboardingStickyFooter>
      </div>
    </TooltipProvider>
  );
}
