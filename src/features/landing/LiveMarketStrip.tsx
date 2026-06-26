"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils/format-number";
import { AnimatedNumber } from "@/shared/ui/AnimatedNumber";
import { LivePill } from "@/shared/ui/LivePill";
import { Sparkline } from "@/shared/ui/Sparkline";

interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

interface MarketSnapshot {
  assets: MarketAsset[];
  updatedAt: string;
}

interface DisplayAsset {
  baseAsset: string;
  price: number;
  change24h: number;
  sparkline: number[];
  quoteVolume: number;
}

const BASE_ASSET_NAMES: Record<string, string> = {
  BTCUSDT: "BTC",
  ETHUSDT: "ETH",
  SOLUSDT: "SOL",
  BNBUSDT: "BNB",
  XRPUSDT: "XRP",
  Bitcoin: "BTC",
  Ethereum: "ETH",
  Solana: "SOL",
  BNB: "BNB",
  XRP: "XRP",
};

function getBaseAsset(symbol: string, name: string): string {
  return BASE_ASSET_NAMES[symbol] ?? BASE_ASSET_NAMES[name] ?? symbol;
}

function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return () => {
    hash = (hash * 9301 + 49297) % 233280;
    return hash / 233280;
  };
}

function generateSparkline(
  price: number,
  changePct: number,
  seed: string,
  points = 24,
): number[] {
  const rand = seededRandom(seed);
  const start = price / (1 + changePct / 100);
  const values: number[] = [];

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const target = start + (price - start) * progress;
    const noise =
      (rand() - 0.5) * Math.abs(price - start) * 0.3 +
      (rand() - 0.5) * price * 0.005;
    values.push(Math.max(target + noise, 0));
  }

  return values;
}

function mapAssets(assets: MarketAsset[]): DisplayAsset[] {
  return assets.map((asset) => ({
    baseAsset: getBaseAsset(asset.symbol, asset.name),
    price: asset.price,
    change24h: asset.change24hPct,
    sparkline: generateSparkline(asset.price, asset.change24hPct, asset.symbol),
    quoteVolume: asset.volume24h * asset.price,
  }));
}

function formatPercentage(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatVolume(value: number): string {
  return formatNumber(value, { decimals: 1, compact: true });
}

const POLL_INTERVAL_MS = 30_000;

export function LiveMarketStrip() {
  const t = useTranslations("landing.liveMarketStrip");
  const [assets, setAssets] = useState<DisplayAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch("/api/market/snapshot");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: MarketSnapshot = await res.json();
      if (data.assets && data.assets.length > 0) {
        setAssets(mapAssets(data.assets));
        setHasError(false);
      } else {
        setHasError(true);
      }
    } catch (err) {
      console.error("[LiveMarketStrip] Failed to fetch snapshot:", err);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchSnapshot]);

  if (loading) {
    return (
      <section className="border-y border-kp-border bg-kp-bg-secondary">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-kp-bg-tertiary" />
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="kp-card flex min-w-[160px] flex-col gap-2"
              >
                <div className="h-4 w-16 animate-pulse rounded bg-kp-bg-tertiary" />
                <div className="h-6 w-24 animate-pulse rounded bg-kp-bg-tertiary" />
                <div className="h-4 w-20 animate-pulse rounded bg-kp-bg-tertiary" />
                <div className="h-10 w-full animate-pulse rounded bg-kp-bg-tertiary" />
                <div className="h-3 w-28 animate-pulse rounded bg-kp-bg-tertiary" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (hasError && assets.length === 0) {
    return null;
  }

  return (
    <section className="border-y border-kp-border bg-kp-bg-secondary">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-kp-text-primary">
            {t("title")}
          </h2>
          {hasError && (
            <span className="text-xs text-kp-text-muted">{t("error")}</span>
          )}
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {assets.map((asset, index) => (
            <div
              key={asset.baseAsset}
              className="kp-card flex min-w-[160px] flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-kp-text-primary">
                  {asset.baseAsset}
                </span>
                {index === 0 && <LivePill />}
              </div>

              <AnimatedNumber
                value={asset.price}
                prefix="$"
                decimals={2}
                className="text-lg font-medium text-kp-text-primary"
              />

              <span
                className={cn(
                  "flex items-center gap-1 text-sm",
                  asset.change24h >= 0
                    ? "text-[var(--kp-positive)]"
                    : "text-[var(--kp-negative)]",
                )}
              >
                {asset.change24h >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {formatPercentage(asset.change24h)}
              </span>

              <div className="h-16 w-full">
                <Sparkline
                  data={asset.sparkline}
                  positive={asset.change24h >= 0}
                />
              </div>

              <span className="text-xs text-kp-text-secondary">
                {t("volume")}: {formatVolume(asset.quoteVolume)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default LiveMarketStrip;
