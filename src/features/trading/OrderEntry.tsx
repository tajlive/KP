"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useTradingStore } from "@/store/tradingStore";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { TrendingUp, TrendingDown, Calculator } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OrderEntry() {
  const t = useTranslations("trading.orderEntry");
  const { selectedSymbol, marketData, openPosition, portfolio } = useTradingStore();

  const [side, setSide] = useState<"long" | "short">("long");
  const [quantity, setQuantity] = useState("");
  const [leverage, setLeverage] = useState("1");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentPrice = marketData[selectedSymbol]?.price || 0;
  const maxPosition = portfolio.balance * parseInt(leverage);

  const calculateMargin = () => {
    const qty = parseFloat(quantity) || 0;
    return (qty * currentPrice) / parseInt(leverage);
  };

  const calculateFee = () => {
    const qty = parseFloat(quantity) || 0;
    return qty * currentPrice * 0.001;
  };

  const handleSubmit = async () => {
    if (!quantity || parseFloat(quantity) <= 0) return;

    setIsSubmitting(true);

    try {
      openPosition({
        symbol: selectedSymbol,
        side,
        entryPrice: currentPrice,
        quantity: parseFloat(quantity),
        leverage: parseInt(leverage),
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      });

      // Reset form
      setQuantity("");
      setStopLoss("");
      setTakeProfit("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid =
    quantity &&
    parseFloat(quantity) > 0 &&
    calculateMargin() <= portfolio.balance;

  return (
    <div className="bg-kp-bg-secondary rounded-2xl border border-kp-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-kp-border">
        <h3 className="text-lg font-bold text-kp-text-primary flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          {t("title")}
        </h3>
        <p className="text-sm text-kp-text-muted">
          {t("symbolPrice", { symbol: selectedSymbol, price: currentPrice.toLocaleString() })}
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Side Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => setSide("long")}
            className={`py-3 px-4 rounded-xl font-bold text-sm transition-all min-h-[44px] ${
              side === "long"
                ? "bg-kp-success text-white shadow-lg"
                : "bg-kp-bg-tertiary text-kp-text-secondary hover:bg-kp-bg-hover"
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            {t("side.long")}
          </button>
          <button
            onClick={() => setSide("short")}
            className={`py-3 px-4 rounded-xl font-bold text-sm transition-all min-h-[44px] ${
              side === "short"
                ? "bg-kp-danger text-white shadow-lg"
                : "bg-kp-bg-tertiary text-kp-text-secondary hover:bg-kp-bg-hover"
            }`}
          >
            <TrendingDown className="w-4 h-4 inline mr-2" />
            {t("side.short")}
          </button>
        </div>

        {/* Quantity */}
        <div>
          <label
            htmlFor="order-entry-quantity"
            className="block text-sm font-medium text-kp-text-secondary mb-1"
          >
            {t("quantity.label")}
          </label>
          <Input
            id="order-entry-quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={t("quantity.placeholder")}
            className="text-lg font-mono bg-kp-input-bg border-kp-input-border text-kp-input-text"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-kp-text-muted">
              {t("quantity.value", { value: ((parseFloat(quantity) || 0) * currentPrice).toLocaleString() })}
            </span>
            <button
              onClick={() => setQuantity((portfolio.balance / currentPrice).toFixed(4))}
              className="text-xs text-kp-brand hover:text-kp-brand-hover hover:underline"
            >
              {t("quantity.max")}
            </button>
          </div>
        </div>

        {/* Leverage */}
        <div>
          <label
            htmlFor="order-entry-leverage"
            className="block text-sm font-medium text-kp-text-secondary mb-2"
          >
            {t("leverage.label", { value: leverage })}
          </label>
          <input
            id="order-entry-leverage"
            type="range"
            min="1"
            max="125"
            value={leverage}
            onChange={(e) => setLeverage(e.target.value)}
            className="w-full h-2 bg-kp-bg-tertiary rounded-lg appearance-none cursor-pointer accent-kp-brand"
          />
          <div className="flex justify-between text-xs text-kp-text-muted mt-1">
            <span>1x</span>
            <span>50x</span>
            <span>125x</span>
          </div>
        </div>

        {/* Stop Loss / Take Profit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="order-entry-stop-loss"
              className="block text-sm font-medium text-kp-text-secondary mb-1"
            >
              {t("stopLoss.label")}
            </label>
            <Input
              id="order-entry-stop-loss"
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder={t("stopLoss.placeholder")}
              className="font-mono bg-kp-input-bg border-kp-input-border text-kp-input-text"
            />
          </div>
          <div>
            <label
              htmlFor="order-entry-take-profit"
              className="block text-sm font-medium text-kp-text-secondary mb-1"
            >
              {t("takeProfit.label")}
            </label>
            <Input
              id="order-entry-take-profit"
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder={t("takeProfit.placeholder")}
              className="font-mono bg-kp-input-bg border-kp-input-border text-kp-input-text"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-kp-bg-tertiary rounded-xl p-4 space-y-2 border border-kp-border">
          <div className="flex justify-between text-sm">
            <span className="text-kp-text-muted">{t("summary.margin")}</span>
            <span className="font-mono font-medium text-kp-text-primary">
              ${calculateMargin().toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-kp-text-muted">{t("summary.fee")}</span>
            <span className="font-mono font-medium text-kp-text-primary">
              ${calculateFee().toFixed(2)}
            </span>
          </div>
          <div className="border-t border-kp-border pt-2 mt-2">
            <div className="flex justify-between">
              <span className="font-medium text-kp-text-primary">{t("summary.total")}</span>
              <span className="font-mono font-bold text-kp-text-primary">
                ${(calculateMargin() + calculateFee()).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <AnimatePresence>
          {isValid && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`w-full py-4 text-lg font-bold rounded-xl transition-all min-h-[44px] ${
                  side === "long"
                    ? "bg-kp-success hover:bg-kp-success/90 text-white"
                    : "bg-kp-danger hover:bg-kp-danger/90 text-white"
                }`}
              >
                {isSubmitting
                  ? t("submit.submitting")
                  : t(`submit.${side}`, { symbol: selectedSymbol })}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {!isValid && quantity && (
          <p className="text-sm text-kp-danger text-center">
            {calculateMargin() > portfolio.balance
              ? t("errors.insufficientMargin")
              : t("errors.enterQuantity")}
          </p>
        )}
      </div>
    </div>
  );
}
