"use client";

import { useAnimatedPrice } from "@/hooks/usePrices";
import { useState, useEffect } from "react";

interface LivePricePreviewProps {
  symbol: string;
  className?: string;
  showInNok?: boolean;
}

function useUsdtNokRate() {
  const [rate, setRate] = useState(9.77);
  useEffect(() => {
    fetch("/api/fx/usdt-nok")
      .then((r) => r.json())
      .then((d) => setRate(d.rate || 9.77))
      .catch(() => setRate(9.77));
  }, []);
  return rate;
}

export function LivePricePreview({ symbol, className = "", showInNok = false }: LivePricePreviewProps) {
  const { price, priceDirection, priceChange24h, isConnected } =
    useAnimatedPrice(symbol);
  const usdtNokRate = useUsdtNokRate();

  // Pris fra usePrices er ALLEREDE NOK (normalisert der). Multiplikasjon her
  // ga dobbel konvertering (BTC viste 6,8 mill. kr i stedet for ~625 000 kr).
  const displayPrice = showInNok
    ? price
    : price > 0 && usdtNokRate > 0
      ? price / usdtNokRate
      : price;
  const formattedPrice = displayPrice > 0
    ? new Intl.NumberFormat("no-NO", {
        style: "currency",
        currency: showInNok ? "NOK" : "USD",
        maximumFractionDigits: displayPrice >= 1000 ? 0 : 2,
      }).format(displayPrice)
    : "";

  if (!formattedPrice || formattedPrice.includes("0,00") || formattedPrice.includes("0.00")) {
    return (
      <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 animate-pulse ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-8 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-[#1A1D26] dark:text-white">
          {symbol.replace("USDT", "")}/USDT
        </span>
        <span
          className={`inline-flex h-2 w-2 rounded-full ${
            isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
          }`}
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-base font-semibold text-[#1A1D26] dark:text-white">
          {formattedPrice}
        </span>
        <span
          className={`text-xs font-medium ${
            priceDirection === "up" ? "text-green-600" : "text-red-600"
          }`}
        >
          {priceDirection === "up" ? "+" : ""}
          {(priceChange24h || 0).toFixed(2)}%
        </span>
      </div>
    </div>
  );
}
