"use client";

import { CURRENCIES, CURRENCY_LABELS, type Currency } from "@/lib/currency";
import { useCurrency } from "@/hooks/useCurrency";
import { motion } from "framer-motion";

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="flex h-8 items-center rounded-full bg-slate-800 p-0.5 text-xs font-medium">
      {CURRENCIES.map((c: Currency) => (
        <button
          key={c}
          onClick={() => setCurrency(c)}
          className="relative z-10 h-7 rounded-full px-3 transition-colors"
          aria-pressed={currency === c}
        >
          {currency === c && (
            <motion.span
              layoutId="currency-pill"
              className="absolute inset-0 rounded-full bg-blue-600"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span
            className={`relative z-10 ${currency === c ? "text-white" : "text-slate-400 hover:text-slate-200"}`}
          >
            {CURRENCY_LABELS[c]}
          </span>
        </button>
      ))}
    </div>
  );
}
