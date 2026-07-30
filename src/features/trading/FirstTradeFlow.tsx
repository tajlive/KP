"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePrices } from "@/hooks/usePrices";
import { trackOnboardingStep } from "@/lib/analytics/onboarding-events";

type Coin = "BTC" | "ETH" | "SOL";
type Step = "coin" | "amount" | "confirm";

const COINS: { id: Coin; pair: string; name: string }[] = [
  { id: "BTC", pair: "BTC/USDT", name: "Bitcoin" },
  { id: "ETH", pair: "ETH/USDT", name: "Ethereum" },
  { id: "SOL", pair: "SOL/USDT", name: "Solana" },
];

const QUICK_AMOUNTS = [200, 500, 1000];
const MIN_AMOUNT = 50;

interface FirstTradeFlowProps {
  /** Kalles når første handel er bekreftet fylt (paper) */
  onComplete: () => void;
}

/**
 * Guidet første-handelsflyt for nye brukere (/trade?first=1).
 * Tre steg — coin, NOK-beløp, bekreft — med én CTA per steg.
 * Bruker samme eksekveringsvei som hovedterminalen
 * (POST /api/paper-trading/execute). Paper/lekepenger hele veien.
 * Ref .hermes/plans/2026-07-22_225030-ny-bruker-reise.md (Task 4).
 */
export function FirstTradeFlow({ onComplete }: FirstTradeFlowProps) {
  const t = useTranslations("trading.firstTrade");
  const { prices } = usePrices();

  const [step, setStep] = React.useState<Step>("coin");
  const [coin, setCoin] = React.useState<Coin | null>(null);
  const [amount, setAmount] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selected = COINS.find((c) => c.id === coin);
  const priceNok = coin
    ? (prices[`${coin}USDT`] as { price?: number } | undefined)?.price
    : undefined;

  const handleConfirm = async () => {
    if (!selected || !amount) return;
    if (amount < MIN_AMOUNT) {
      setError(t("minError"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/paper-trading/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair: selected.pair,
          side: "buy",
          amount_nok: amount,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        trackOnboardingStep("first_trade_completed", {
          coin: selected.id,
          amount,
        });
        onComplete();
      } else {
        setError(data.error ?? "Ukjent feil");
      }
    } catch {
      setError("Kunne ikke koble til — sjekk nettverket og prøv igjen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="first-trade-flow"
      className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">{t("title")}</h2>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
          {t("paperBadge")}
        </span>
      </div>

      {step === "coin" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">{t("stepCoin")}</p>
          <div className="grid grid-cols-3 gap-2">
            {COINS.map((c) => (
              <button
                key={c.id}
                data-testid={`coin-${c.id}`}
                onClick={() => {
                  setCoin(c.id);
                  setStep("amount");
                }}
                className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-white transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10"
              >
                <span className="text-base font-bold">{c.id}</span>
                <span className="text-[11px] text-slate-400">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "amount" && selected && (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            {t("stepAmount")} — {selected.name}
            {priceNok ? ` · ${Math.round(priceNok).toLocaleString("nb-NO")} kr` : ""}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                data-testid={`amount-${a}`}
                onClick={() => {
                  setAmount(a);
                  setStep("confirm");
                }}
                className="flex min-h-[48px] items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-base font-semibold text-white transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10"
              >
                {a} kr
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep("coin")}
            className="text-sm text-slate-500 underline-offset-4 hover:underline"
          >
            ← {selected.id}
          </button>
        </div>
      )}

      {step === "confirm" && selected && amount && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">{t("stepConfirm")}</p>
          <p className="rounded-xl bg-white/5 px-4 py-3 text-center text-base text-white">
            {t("summary", { coin: selected.id, amount })}
          </p>
          {error && (
            <p
              data-testid="trade-error"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400"
            >
              {error}
            </p>
          )}
          <button
            data-testid="confirm-trade"
            onClick={handleConfirm}
            disabled={loading}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-base font-bold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading ? "…" : t("confirmCta")}
          </button>
          <button
            onClick={() => setStep("amount")}
            className="text-sm text-slate-500 underline-offset-4 hover:underline"
          >
            ← {amount} kr
          </button>
        </div>
      )}
    </div>
  );
}
