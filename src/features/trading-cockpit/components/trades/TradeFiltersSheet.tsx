"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { MobileBottomSheet } from "@/shared/ui/mobile-bottom-sheet";
import type { CockpitFilters } from "@/features/trading-cockpit/types";

const DATE_RANGES: CockpitFilters["dateRange"][] = ["7d", "30d", "90d", "1y", "all"];
const SIDES: CockpitFilters["side"][] = ["all", "buy", "sell"];
const TRADE_STATUSES: CockpitFilters["tradeStatus"][] = [
  "all",
  "filled",
  "partially_filled",
  "pending",
  "cancelled",
  "failed",
];
const SESSION_STATUSES: CockpitFilters["sessionStatus"][] = [
  "all",
  "active",
  "paused",
  "stopped",
  "crashed",
];

interface TradeFiltersSheetProps {
  filters: CockpitFilters;
  onChange: (filters: Partial<CockpitFilters>) => void;
  onReset: () => void;
  pairs?: string[];
  className?: string;
}

export function TradeFiltersSheet({
  filters,
  onChange,
  onReset,
  pairs = [],
  className,
}: TradeFiltersSheetProps) {
  const t = useTranslations("trading");
  const [open, setOpen] = React.useState(false);

  const hasActiveFilters =
    filters.dateRange !== "30d" ||
    filters.pair !== null ||
    filters.sessionStatus !== "all" ||
    filters.side !== "all" ||
    filters.tradeStatus !== "all" ||
    filters.search !== "";

  return (
    <div className={cn("md:hidden", className)} data-testid="trade-filters-sheet-trigger">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full border-white/[0.08] text-white hover:bg-white/[0.05]"
      >
        <SlidersHorizontal className="w-4 h-4 mr-2" />
        {t("cockpit.trades.filters.open")}
        {hasActiveFilters && (
          <span className="ml-2 w-2 h-2 rounded-full bg-brand-500" />
        )}
      </Button>

      <MobileBottomSheet
        open={open}
        onOpenChange={setOpen}
        title={t("cockpit.trades.filters.title")}
        height="lg"
        footer={
          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onReset();
                setOpen(false);
              }}
              disabled={!hasActiveFilters}
              className="flex-1 text-gray-400 hover:text-white disabled:opacity-40"
              data-testid="trade-filters-sheet-reset"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              {t("cockpit.trades.filters.reset")}
            </Button>
            <Button
              size="sm"
              onClick={() => setOpen(false)}
              className="flex-1 bg-[var(--kp-ai)] text-white hover:bg-[var(--kp-ai)]/90"
            >
              {t("cockpit.trades.filters.apply")}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm text-gray-400">{t("cockpit.trades.filters.search")}</Label>
            <Input
              type="text"
              placeholder={t("cockpit.trades.filters.placeholder")}
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-500"
              data-testid="trade-mobile-search-input"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-gray-400">{t("cockpit.trades.filters.dateRange")}</Label>
            <Select
              value={filters.dateRange}
              onValueChange={(value) =>
                onChange({ dateRange: value as CockpitFilters["dateRange"] })
              }
            >
              <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((range) => (
                  <SelectItem key={range} value={range}>
                    {t(`cockpit.trades.dateRange.${range}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-gray-400">{t("cockpit.trades.filters.pair")}</Label>
            <Select
              value={filters.pair ?? "all"}
              onValueChange={(value) =>
                onChange({ pair: value === "all" ? null : value })
              }
            >
              <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("cockpit.trades.filters.all")}</SelectItem>
                {pairs.map((pair) => (
                  <SelectItem key={pair} value={pair}>
                    {pair}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-gray-400">{t("cockpit.trades.filters.side")}</Label>
            <Select
              value={filters.side}
              onValueChange={(value) =>
                onChange({ side: value as CockpitFilters["side"] })
              }
            >
              <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIDES.map((side) => (
                  <SelectItem key={side} value={side}>
                    {t(`cockpit.trades.filters.${side}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-gray-400">{t("cockpit.trades.filters.tradeStatus")}</Label>
            <Select
              value={filters.tradeStatus}
              onValueChange={(value) =>
                onChange({ tradeStatus: value as CockpitFilters["tradeStatus"] })
              }
            >
              <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRADE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`cockpit.trades.status.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-gray-400">{t("cockpit.trades.filters.sessionStatus")}</Label>
            <Select
              value={filters.sessionStatus}
              onValueChange={(value) =>
                onChange({ sessionStatus: value as CockpitFilters["sessionStatus"] })
              }
            >
              <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`cockpit.sessions.status.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </MobileBottomSheet>
    </div>
  );
}
