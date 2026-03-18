"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BRAND } from "@/lib/design/tokens";

const PAIRS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"] as const;

function formatPrice(price: number): string {
  if (price <= 0) return "—";
  return price >= 1000
    ? price.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : price.toFixed(2);
}

export function HeaderTicker() {
  const t = useTranslations("navigation");
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchAll = async () => {
      const results = await Promise.all(
        PAIRS.map(async (symbol) => {
          try {
            const res = await fetch(`/api/trading/price?symbol=${symbol}`);
            const data = await res.json();
            return {
              symbol: symbol.replace("USDT", ""),
              price: data.price ?? 0,
            };
          } catch {
            return { symbol: symbol.replace("USDT", ""), price: 0 };
          }
        }),
      );
      setPrices(Object.fromEntries(results.map((r) => [r.symbol, r.price])));
    };
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden lg:flex items-center gap-4 text-sm text-[#5E6478] min-w-0 flex-1 justify-center">
      <div className="flex items-center gap-4 shrink-0">
        {PAIRS.map((pair) => (
          <span
            key={pair}
            className="tabular-nums font-medium whitespace-nowrap"
          >
            {pair.replace("USDT", "")} $
            {formatPrice(prices[pair.replace("USDT", "")] ?? 0)}
          </span>
        ))}
      </div>
      <span
        className={`${BRAND.link} font-semibold shrink-0 whitespace-nowrap`}
      >
        {t("freeBalance")}
      </span>
    </div>
  );
}
