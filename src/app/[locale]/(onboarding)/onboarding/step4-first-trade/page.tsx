"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { m, useReducedMotion } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { AnimatedNumber } from "@/shared/ui/AnimatedNumber";
import { RiskBadge } from "@/shared/ui/RiskBadge";
import { createClient } from "@/lib/supabase/client";
import { Bitcoin, TrendingUp, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

const FIRST_TRADE_SYMBOL = "BTCUSDT";
const PRESETS = [1000, 5000, 10000, 20000];
const PRICE_INTERVAL_MS = 30_000;

interface TradeResult {
  tradeId: string;
  executionPrice: number;
  slippageBps: number;
  symbol: string;
  amount: number;
}

async function fetchBtcPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`/api/market/snapshot`, {
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        assets: Array<{ symbol: string; price: number }>;
      };
      const asset = data.assets.find(
        (a) => a.symbol === symbol || a.symbol === "Bitcoin",
      );
      if (asset?.price) return asset.price;
    }
  } catch (err) {
    console.warn("[step4] market snapshot failed:", err);
  }

  // Binance client-side fallback
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { lastPrice?: string };
    const price = data.lastPrice ? parseFloat(data.lastPrice) : null;
    return price && Number.isFinite(price) ? price : null;
  } catch (err) {
    console.warn("[step4] Binance fallback failed:", err);
    return null;
  }
}

const triggerConfetti = async () => {
  if (typeof window === "undefined") return;

  const { default: confetti } = await import("canvas-confetti");

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (prefersReducedMotion) return;

  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#2563eb", "#3b82f6", "#60a5fa", "#ffffff"],
    disableForReducedMotion: true,
  });
};

export default function OnboardingStep4FirstTrade() {
  const t = useTranslations("onboarding.firstTrade");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const prefersReducedMotion = useReducedMotion();

  const [checking, setChecking] = useState(true);
  const [paperBalance, setPaperBalance] = useState(0);
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tradeResult, setTradeResult] = useState<TradeResult | null>(null);

  const amount = selectedAmount ?? (Number(customAmount) || 0);
  const canSubmit = amount > 0 && amount <= paperBalance && !loading;

  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push(
            `/${locale}/innlogging?next=${encodeURIComponent(`/${locale}/onboarding/step4-first-trade`)}`,
          );
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("onboarding_step, onboarding_completed, paper_balance")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        if (profile?.onboarding_completed) {
          router.push(`/${locale}/dashboard`);
          return;
        }

        const step = profile?.onboarding_step ?? 0;

        switch (step) {
          case 0:
            router.push(`/${locale}/onboarding/step1-welcome`);
            return;
          case 1:
            router.push(`/${locale}/onboarding/step2-level`);
            return;
          case 2:
            router.push(`/${locale}/onboarding/step3-trading-mode`);
            return;
          case 3:
            // stay on step4-first-trade
            break;
          case 4:
            router.push(`/${locale}/onboarding/step5-complete`);
            return;
          default:
            router.push(`/${locale}/dashboard`);
            return;
        }

        if (mounted) {
          setPaperBalance(profile?.paper_balance ?? 0);
        }
      } catch (err) {
        console.error("Failed to load onboarding status:", err);
        if (mounted) setError(t("error"));
      } finally {
        if (mounted) setChecking(false);
      }
    };

    void checkStatus();

    return () => {
      mounted = false;
    };
  }, [router, supabase, locale, t]);

  useEffect(() => {
    if (checking) return;

    let mounted = true;

    const loadPrice = async () => {
      const price = await fetchBtcPrice(FIRST_TRADE_SYMBOL);
      if (mounted) setBtcPrice(price);
    };

    void loadPrice();
    const interval = setInterval(() => void loadPrice(), PRICE_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [checking]);

  const handlePreset = (value: number) => {
    setSelectedAmount(value);
    setCustomAmount("");
    setError(null);
  };

  const handleCustomChange = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    setCustomAmount(digits);
    setSelectedAmount(null);
    setError(null);
  };

  const handleMax = () => {
    setSelectedAmount(null);
    setCustomAmount(String(Math.floor(paperBalance)));
    setError(null);
  };

  const handleBuy = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/first-paper-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: FIRST_TRADE_SYMBOL, amount }),
      });

      const data = (await res.json()) as TradeResult & { error?: string };

      if (!res.ok) {
        throw new Error(data.error || t("error"));
      }

      setTradeResult(data);
      setSuccess(true);
      void triggerConfetti();
    } catch (err) {
      console.error("Failed to place first paper trade:", err);
      setError(err instanceof Error ? err.message : t("error"));
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div role="status" className="flex items-center justify-center py-12">
        <div
          className="h-8 w-8 animate-spin rounded-full border-b-2"
          style={{ borderColor: "var(--kp-ai)" }}
        />
        <span className="sr-only">{t("buying")}</span>
      </div>
    );
  }

  if (success && tradeResult) {
    return (
      <m.div
        className="min-h-full flex flex-col items-center text-center gap-6"
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="w-16 h-16 bg-[var(--kp-positive)]/10 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-[var(--kp-positive)]" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[var(--kp-text-primary)]">
            {t("success.title")}
          </h1>
          <p className="text-[var(--kp-text-secondary)]">
            {t("success.description")}
          </p>
        </div>

        <Card className="w-full bg-[var(--kp-bg-secondary)] border border-[var(--kp-border)] rounded-2xl p-6 gap-3 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--kp-text-secondary)]">
              {t("price")}
            </span>
            <span className="font-medium text-[var(--kp-text-primary)]">
              {tradeResult.executionPrice.toLocaleString(locale, {
                maximumFractionDigits: 2,
              })}{" "}
              USD
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--kp-text-secondary)]">
              {t("amountLabel")}
            </span>
            <span className="font-medium text-[var(--kp-text-primary)]">
              {tradeResult.amount.toLocaleString(locale)} kr
            </span>
          </div>
        </Card>

        <Button
          onClick={() => router.push(`/${locale}/onboarding/step5-complete`)}
          className="w-full h-12 text-lg font-semibold"
          size="lg"
        >
          {t("success.cta")}
        </Button>
      </m.div>
    );
  }

  return (
    <m.div
      className="min-h-full flex flex-col gap-6"
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-bold text-[var(--kp-text-primary)]">
            {t("title")}
          </h1>
          <RiskBadge level="medium" />
        </div>
        <p className="text-[var(--kp-text-secondary)]">{t("subtitle")}</p>
      </div>

      {/* Balance & Price */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-[var(--kp-bg-secondary)] border border-[var(--kp-border)] rounded-2xl p-4 gap-2 text-center">
          <p className="text-xs text-[var(--kp-text-secondary)] flex items-center justify-center gap-1">
            <Bitcoin className="w-3.5 h-3.5" />
            {t("balance")}
          </p>
          <AnimatedNumber
            value={paperBalance}
            suffix=" kr"
            decimals={0}
            className="text-xl font-bold text-[var(--kp-text-primary)]"
          />
        </Card>

        <Card className="bg-[var(--kp-bg-secondary)] border border-[var(--kp-border)] rounded-2xl p-4 gap-2 text-center">
          <p className="text-xs text-[var(--kp-text-secondary)] flex items-center justify-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {t("price")}
          </p>
          {btcPrice ? (
            <AnimatedNumber
              value={btcPrice}
              prefix="$"
              decimals={2}
              className="text-xl font-bold text-[var(--kp-text-primary)]"
            />
          ) : (
            <span className="text-xl font-bold text-[var(--kp-text-secondary)]">
              —
            </span>
          )}
        </Card>
      </div>

      {/* Amount selection */}
      <div className="space-y-3">
        <label
          htmlFor="first-trade-amount"
          className="text-sm font-medium text-[var(--kp-text-primary)]"
        >
          {t("amountLabel")}
        </label>

        <div className="grid grid-cols-2 gap-3">
          {PRESETS.map((preset) => {
            const isSelected = selectedAmount === preset;
            return (
              <Button
                key={preset}
                type="button"
                variant={isSelected ? "default" : "secondary"}
                onClick={() => handlePreset(preset)}
                className="h-14 text-base"
                aria-pressed={isSelected}
              >
                {t(`presets.${preset}`)}
              </Button>
            );
          })}
        </div>

        <div className="relative">
          <input
            id="first-trade-amount"
            type="text"
            inputMode="numeric"
            value={customAmount}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder={t("custom")}
            className="w-full h-12 px-4 pr-16 rounded-lg border border-[var(--kp-border)] bg-[var(--kp-bg-primary)] text-[var(--kp-text-primary)] placeholder:text-[var(--kp-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--kp-ai)]"
          />
          <button
            type="button"
            onClick={handleMax}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium rounded-md bg-[var(--kp-bg-secondary)] text-[var(--kp-ai)] hover:bg-[var(--kp-bg-tertiary)] transition-colors min-h-[32px]"
          >
            {t("max")}
          </button>
        </div>

        {amount > paperBalance && (
          <p className="text-sm text-[var(--kp-negative)]" role="alert">
            {t("error")}
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-[var(--kp-negative)] text-center" role="alert">
          {error}
        </p>
      )}

      {/* CTA */}
      <Button
        onClick={handleBuy}
        disabled={!canSubmit}
        loading={loading}
        className="w-full h-12 text-lg font-semibold"
        size="lg"
      >
        {loading ? t("buying") : t("buyCta")}
      </Button>
    </m.div>
  );
}
