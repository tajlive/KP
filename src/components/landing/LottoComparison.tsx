"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator,
  Coins,
  PiggyBank,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

export function LottoComparison() {
  const locale = useLocale();
  const t = useTranslations("calculator");
  const [weeklyAmount, setWeeklyAmount] = useState(200);
  const [years, setYears] = useState(5);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [results, setResults] = useState({
    lotto: 0,
    bank: 0,
    crypto: 0,
  });

  const handleSliderChange = (value: number) => {
    setWeeklyAmount(value);
    setHasInteracted(true);
  };

  useEffect(() => {
    const weeks = years * 52;
    const totalInvested = weeklyAmount * weeks;

    // Lotto: -40% expected return (you lose 40% on average)
    const lottoResult = totalInvested * 0.6;

    // Bank: 3% annual interest
    const bankResult =
      weeklyAmount * ((Math.pow(1 + 0.03 / 52, weeks) - 1) / (0.03 / 52));

    // Crypto: Hypothetical 0.1% daily (EXTREMELY optimistic)
    // This is 0.7% weekly
    const cryptoResult =
      weeklyAmount * ((Math.pow(1 + 0.007, weeks) - 1) / 0.007);

    setResults({
      lotto: Math.round(lottoResult),
      bank: Math.round(bankResult),
      crypto: Math.round(cryptoResult),
    });
  }, [weeklyAmount, years]);

  const formatNOK = (amount: number) => {
    return `kr ${amount.toLocaleString("nb-NO")}`;
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 md:p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="font-fraunces text-2xl md:text-3xl font-bold text-slate-100 mb-2">
          {t("lotto.title")}
        </h3>
        <p className="font-lexend text-slate-400">{t("lotto.subtitle")}</p>
      </div>

      {/* Controls */}
      <div className="bg-slate-800 rounded-xl p-6 mb-8">
        <div className="mb-6">
          <label
            htmlFor="lotto-comp-weekly"
            className="flex items-center gap-2 font-lexend text-sm text-slate-300 mb-3"
          >
            <Calculator className="w-4 h-4" />
            {t("lotto.weeklySpend")}
          </label>
          <input
            id="lotto-comp-weekly"
            type="range"
            min="50"
            max="1000"
            step="50"
            value={weeklyAmount}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
          <div className="flex justify-between mt-2">
            <span className="font-lexend text-xs text-slate-500">kr 50</span>
            <span className="font-fraunces text-xl font-bold text-teal-400">
              kr {weeklyAmount}
            </span>
            <span className="font-lexend text-xs text-slate-500">kr 1000</span>
          </div>
        </div>

        <div role="group" aria-labelledby="lotto-comp-years-label">
          <span
            id="lotto-comp-years-label"
            className="font-lexend text-sm text-slate-300 mb-3 block"
          >
            {t("lotto.timeHorizon")}
          </span>
          <div className="flex gap-2">
            {[1, 3, 5, 10].map((y) => (
              <button
                key={y}
                onClick={() => setYears(y)}
                className={`flex-1 py-2 px-3 rounded-lg font-lexend text-sm transition-colors ${
                  years === y
                    ? "bg-teal-500 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {y} {t("lotto.years")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* Lotto */}
        <motion.div
          key={`lotto-${weeklyAmount}-${years}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-950/30 border border-rose-800/50 rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-rose-500/20 rounded-lg flex items-center justify-center">
              <Coins className="w-5 h-5 text-rose-400" />
            </div>
            <h4 className="font-fraunces font-bold text-rose-200">
              {t("lotto.lotto")}
            </h4>
          </div>
          <p className="font-lexend text-3xl font-bold text-rose-400 mb-1">
            {formatNOK(results.lotto)}
          </p>
          <p className="font-lexend text-xs text-rose-300/70">
            {t("lotto.expectedLoss")}:{" "}
            {formatNOK(weeklyAmount * years * 52 - results.lotto)}
          </p>
          <p className="font-lexend text-xs text-rose-300/50 mt-2">
            *{t("lotto.statLoss")}
          </p>
        </motion.div>

        {/* Bank */}
        <motion.div
          key={`bank-${weeklyAmount}-${years}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="font-fraunces font-bold text-emerald-200">
              {t("lotto.highInterest")}
            </h4>
          </div>
          <p className="font-lexend text-3xl font-bold text-emerald-400 mb-1">
            {formatNOK(results.bank)}
          </p>
          <p className="font-lexend text-xs text-emerald-300/70">
            {t("lotto.annualRate")}
          </p>
          <p className="font-lexend text-xs text-emerald-300/50 mt-2">
            *{t("lotto.bankGuarantee")}
          </p>
        </motion.div>

        {/* Crypto */}
        <motion.div
          key={`crypto-${weeklyAmount}-${years}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-teal-950/30 border border-teal-800/50 rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-teal-400" />
            </div>
            <h4 className="font-fraunces font-bold text-teal-200">
              {t("lotto.cryptoTheoretical")}
            </h4>
          </div>
          <p className="font-lexend text-3xl font-bold text-teal-400 mb-1">
            {formatNOK(results.crypto)}
          </p>
          <p className="font-lexend text-xs text-teal-300/70">
            {t("lotto.dailyReturn")}
          </p>
          <p className="font-lexend text-xs text-teal-300/50 mt-2">
            *{t("lotto.noGuarantee")}
          </p>
        </motion.div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-lexend text-sm text-amber-200 font-medium mb-1">
            {t("lotto.important")}
          </p>
          <p className="font-lexend text-xs text-amber-300/70">
            {t("lotto.disclaimer")}
          </p>
        </div>
      </div>

      {/* CTA - alltid synlig */}
      <div className="mt-6 text-center">
        <Link
          href={`/${locale}/signup`}
          className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-white font-lexend font-bold px-8 py-4 rounded-xl shadow-lg shadow-teal-500/30 transition-all"
        >
          {t("cta_after_result")}
          <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="font-lexend text-sm text-slate-500 mt-3">
          {t("cta_no_card")}
        </p>
      </div>

      {/* Ekstra CTA etter interaksjon med slider */}
      <AnimatePresence>
        {hasInteracted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 text-center"
          >
            <Link
              href={`/${locale}/priser`}
              className="text-teal-400 hover:text-teal-300 font-lexend text-sm font-medium underline underline-offset-2"
            >
              {locale === "no" ? "Se prisplaner →" : "View pricing plans →"}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
