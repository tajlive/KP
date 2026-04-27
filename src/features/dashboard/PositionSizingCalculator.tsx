"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useLocale } from "next-intl";
import { Calculator, ArrowRight, Info, AlertTriangle } from "lucide-react";

interface PositionSizingCalculatorProps {
  accountBalance?: number;
}

export function PositionSizingCalculator({ accountBalance = 100000 }: PositionSizingCalculatorProps) {
  const locale = useLocale();
  const isNo = locale === "no";
  const [riskPercent, setRiskPercent] = useState(1);
  const [stopLossPercent, setStopLossPercent] = useState(2);
  const [entryPrice, setEntryPrice] = useState(50000);
  const [showInfo, setShowInfo] = useState(false);

  // Calculations (guarded against division by zero)
  const riskAmount = accountBalance * (riskPercent / 100);
  const positionSize = riskAmount / (stopLossPercent / 100);
  const units = entryPrice > 0 ? positionSize / entryPrice : 0;
  const leverage = accountBalance > 0 ? positionSize / accountBalance : 0;

  const isOverLeveraged = leverage > 5;
  const isRiskTooHigh = riskPercent > 2;

  return (
    <motion.div
      className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {isNo ? "Posisjonskalkulator" : "Position Sizing Calculator"}
          </h3>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>

      {showInfo && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-200"
        >
          {isNo
            ? "Beregn optimal posisjonsstørrelse basert på din risiko-toleranse og stop-loss. Regelen er: Risiker aldri mer enn 1-2% av kontoen per trade."
            : "Calculate optimal position size based on your risk tolerance and stop-loss. The rule is: Never risk more than 1-2% of your account per trade."}
        </motion.div>
      )}

      <div className="space-y-4">
        {/* Account Balance (read-only or editable) */}
        <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
          <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">{isNo ? "Kontobalanse" : "Account Balance"}</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {accountBalance.toLocaleString()} NOK
          </span>
        </div>

        {/* Risk % */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
              {isNo ? "Risiko per trade" : "Risk per trade"}
            </label>
            <span
              className={`text-xs font-bold ${
                isRiskTooHigh ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {riskPercent}%
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={5}
            step={0.1}
            value={riskPercent}
            onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
            <span>0.1%</span>
            <span>5%</span>
          </div>
          {isRiskTooHigh && (
            <p className="flex items-center gap-1 text-[10px] text-red-400 mt-1">
              <AlertTriangle className="w-3 h-3" />
              {isNo
                ? "Over 2% anbefales ikke for konservativ trading."
                : "Over 2% is not recommended for conservative trading."}
            </p>
          )}
        </div>

        {/* Stop Loss % */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
              {isNo ? "Stop-loss %" : "Stop-loss %"}
            </label>
            <span className="text-xs font-bold text-slate-900 dark:text-white">{stopLossPercent}%</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={10}
            step={0.5}
            value={stopLossPercent}
            onChange={(e) => setStopLossPercent(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Entry Price */}
        <div>
          <label className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 block mb-1.5">
            {isNo ? "Inngangspris (NOK)" : "Entry price (NOK)"}
          </label>
          <input
            type="number"
            value={entryPrice}
            onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Results */}
      <div className="mt-5 p-4 bg-slate-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">{isNo ? "Risiko-beløp" : "Risk amount"}</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{riskAmount.toLocaleString()} NOK</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">{isNo ? "Posisjonsstørrelse" : "Position size"}</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{positionSize.toLocaleString()} NOK</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">{isNo ? "Enheter" : "Units"}</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{units.toFixed(4)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">{isNo ? "Effektiv gearing" : "Effective leverage"}</span>
          <span
            className={`text-sm font-bold ${
              isOverLeveraged ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {leverage.toFixed(1)}x
          </span>
        </div>

        {isOverLeveraged && (
          <p className="flex items-center gap-1 text-[10px] text-red-400">
            <AlertTriangle className="w-3 h-3" />
            {isNo
              ? "Gearing over 5x er svært riskabelt. Vurder lavere posisjonsstørrelse."
              : "Leverage above 5x is extremely risky. Consider a smaller position."}
          </p>
        )}
      </div>

      {/* Formula hint */}
      <div className="mt-3 text-center">
        <p className="text-[10px] text-slate-600">
          {isNo ? "Formel:" : "Formula:"}{" "}
          <span className="font-mono text-slate-400 dark:text-slate-500">
            Pos = (Bal × Risk%) / Stop%
          </span>
        </p>
      </div>
    </motion.div>
  );
}

export default PositionSizingCalculator;
