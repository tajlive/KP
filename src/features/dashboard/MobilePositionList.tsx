"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHaptic } from "@/hooks/use-haptic";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { MobileTradingCard } from "@/shared/ui/mobile-trading-card";
import { SwipeAction } from "@/shared/ui/swipe-action";
import { PullToRefreshIndicator } from "@/shared/ui/pull-to-refresh-indicator";
import { MARKET_DESK } from "@/lib/design/market-desk";
import { TrendingUp, X, ShoppingCart } from "lucide-react";

interface Position {
  symbol: string;
  qty: number;
  value: number;
}

interface MobilePositionListProps {
  positions: Position[];
  priceForSymbol: (sym: string) => number;
  gradientForSymbol: (sym: string) => string;
  formatNOK: (locale: string, n: number) => string;
  onRefresh: () => Promise<void>;
}

/**
 * MobilePositionList — Robinhood-inspired mobile portfolio view
 *
 * Integrates:
 * - MobileTradingCard: compact position cards with PnL
 * - SwipeAction: swipe left to close, swipe right to buy more
 * - PullToRefresh: pull down to refresh positions
 * - useHaptic: tactile feedback on interactions
 *
 * Falls back to desktop list view on non-mobile screens.
 */
export function MobilePositionList({
  positions,
  priceForSymbol,
  formatNOK,
  onRefresh,
}: MobilePositionListProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const router = useRouter();
  const isMobile = useIsMobile();
  const haptic = useHaptic();

  const { state, handlers, style } = usePullToRefresh({
    onRefresh: async () => {
      haptic("success");
      await onRefresh();
    },
  });

  // On desktop, don't render mobile cards
  if (isMobile === false) {
    return null;
  }

  if (positions.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-slate-500 text-sm">{t("marketDesk.noPositions")}</p>
      </div>
    );
  }

  return (
    <div
      className="md:hidden"
      onTouchStart={handlers.onTouchStart}
      onTouchMove={handlers.onTouchMove}
      onTouchEnd={handlers.onTouchEnd}
    >
      <PullToRefreshIndicator
        distance={state.distance}
        isReady={state.isReadyToRelease}
        isRefreshing={state.isRefreshing}
      />

      <div style={style} className="space-y-2">
        {positions.map((pos) => {
          const price = priceForSymbol(pos.symbol);
          const currentValue = pos.qty * price;
          const pnl = currentValue - pos.value;
          const pnlPercent = pos.value !== 0 ? (pnl / pos.value) * 100 : 0;
          const shortSym = pos.symbol.replace("USDT", "");
          const avgPrice = pos.qty > 0 ? pos.value / pos.qty : 0;

          return (
            <SwipeAction
              key={pos.symbol}
              leftActions={[
                {
                  id: "close",
                  label: t("marketDesk.close") || "Close",
                  icon: <X className="w-4 h-4" />,
                  color: "#ef4444",
                  onAction: () => {
                    haptic("heavy");
                    // Navigate to trading page for this symbol
                    router.push(`/${locale}/dashboard/trade?symbol=${shortSym}&action=sell`);
                  },
                },
              ]}
              rightActions={[
                {
                  id: "buy",
                  label: t("marketDesk.buy") || "Buy",
                  icon: <ShoppingCart className="w-4 h-4" />,
                  color: "#22c55e",
                  onAction: () => {
                    haptic("medium");
                    router.push(`/${locale}/dashboard/trade?symbol=${shortSym}&action=buy`);
                  },
                },
                {
                  id: "chart",
                  label: t("marketDesk.chart") || "Chart",
                  icon: <TrendingUp className="w-4 h-4" />,
                  color: "#3b82f6",
                  onAction: () => {
                    haptic("light");
                    router.push(`/${locale}/dashboard/trade?symbol=${shortSym}`);
                  },
                },
              ]}
            >
              <MobileTradingCard
                symbol={shortSym}
                name={pos.symbol}
                quantity={pos.qty}
                avgPrice={avgPrice}
                currentPrice={price}
                currency="NOK"
                changePercent={pnlPercent}
                onPress={() => {
                  haptic("light");
                  router.push(`/${locale}/dashboard/trade?symbol=${shortSym}`);
                }}
                onBuy={() => {
                  haptic("medium");
                  router.push(`/${locale}/dashboard/trade?symbol=${shortSym}&action=buy`);
                }}
                onSell={() => {
                  haptic("medium");
                  router.push(`/${locale}/dashboard/trade?symbol=${shortSym}&action=sell`);
                }}
              />
            </SwipeAction>
          );
        })}
      </div>
    </div>
  );
}

/**
 * DesktopPositionList — eksisterende desktop-visning
 *
 * Separat komponent for å holde PortfolioDashboard ren.
 */
export function DesktopPositionList({
  positions,
  priceForSymbol,
  gradientForSymbol,
  formatNOK,
}: Omit<MobilePositionListProps, "onRefresh">) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const isMobile = useIsMobile();

  // On mobile, don't render desktop list
  if (isMobile === true) {
    return null;
  }

  if (positions.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-slate-500 text-sm">{t("marketDesk.noPositions")}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {positions.map((pos) => {
        const price = priceForSymbol(pos.symbol);
        const pnlPct =
          pos.value !== 0
            ? ((pos.qty * price - pos.value) / pos.value) * 100
            : 0;
        const shortSym = pos.symbol.replace("USDT", "");
        return (
          <li
            key={pos.symbol}
            className={`${MARKET_DESK.row} flex items-center gap-3`}
          >
            <div
              className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradientForSymbol(pos.symbol)} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-inner`}
            >
              {shortSym[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-100">{shortSym}</p>
              <p className="text-xs text-slate-500 tabular-nums">
                {pos.qty.toFixed(4)} {shortSym}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p
                className="text-sm font-medium text-slate-100 tabular-nums"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatNOK(locale, pos.qty * price)}
              </p>
              <p
                className={`text-xs font-semibold tabular-nums ${pnlPct >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {pnlPct >= 0 ? "+" : ""}
                {pnlPct.toFixed(1)}%
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
