"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Info,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
} from "lucide-react";

interface PnlBreakdownProps {
  startingCapital: number;
  currentCapital: number;
  paperBalance: number;
  totalBuyValue: number;
  totalSellValue: number;
  totalFees: number;
  realizedPnl: number;
  unrealizedPnl: number;
  tradeCount: number;
}

function formatNOK(value: number): string {
  return new Intl.NumberFormat("no-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PnlBreakdown({
  startingCapital,
  currentCapital,
  paperBalance,
  totalBuyValue,
  totalSellValue,
  totalFees,
  realizedPnl,
  unrealizedPnl,
  tradeCount,
}: PnlBreakdownProps) {
  const t = useTranslations("pnlBreakdown");
  const [isOpen, setIsOpen] = useState(false);

  const allocated = startingCapital;
  const available = paperBalance - allocated;
  const cashFlow = totalSellValue - totalBuyValue - totalFees;

  const hasData = tradeCount > 0;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#0052FF]" />
          <span className="text-sm font-medium text-[#1A1D26] dark:text-slate-100">
            {t("title")}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {!hasData ? (
                <p className="text-sm text-slate-500">{t("empty")}</p>
              ) : (
                <>
                  {/* Capital allocation */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("capitalTitle")}
                    </p>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      <Wallet className="w-4 h-4 text-[#0052FF] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {t("allocated")}
                          </span>
                          <span className="text-sm font-medium text-[#1A1D26] dark:text-slate-100">
                            {formatNOK(allocated)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {t("available")}
                          </span>
                          <span className="text-sm font-medium text-[#1A1D26] dark:text-slate-100">
                            {formatNOK(available)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cash flow */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("cashFlowTitle")}
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-500/10">
                        <ArrowDownLeft className="w-4 h-4 text-red-500 shrink-0" />
                        <span className="text-sm text-slate-600 dark:text-slate-400 flex-1">
                          {t("buyTotal")}
                        </span>
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                          −{formatNOK(totalBuyValue)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                        <ArrowUpRight className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-sm text-slate-600 dark:text-slate-400 flex-1">
                          {t("sellTotal")}
                        </span>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          +{formatNOK(totalSellValue)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <Receipt className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-600 dark:text-slate-400 flex-1">
                          {t("fees")}
                        </span>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          −{formatNOK(totalFees)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">
                          {t("netCashFlow")}
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            cashFlow >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {cashFlow >= 0 ? "+" : ""}
                          {formatNOK(cashFlow)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Realized vs Unrealized */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("pnlTitle")}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <div className="flex items-center gap-1.5 mb-1">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs text-slate-500">
                            {t("realized")}
                          </span>
                        </div>
                        <p
                          className={`text-lg font-bold ${
                            realizedPnl >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {realizedPnl >= 0 ? "+" : ""}
                          {formatNOK(realizedPnl)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <div className="flex items-center gap-1.5 mb-1">
                          <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs text-slate-500">
                            {t("unrealized")}
                          </span>
                        </div>
                        <p
                          className={`text-lg font-bold ${
                            unrealizedPnl >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {unrealizedPnl >= 0 ? "+" : ""}
                          {formatNOK(unrealizedPnl)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                    <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                      {t("hint")}
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
