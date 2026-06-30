"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Search, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { SURFACE } from "@/lib/design/tokens";
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

interface TradeFiltersProps {
  filters: CockpitFilters;
  onChange: (filters: Partial<CockpitFilters>) => void;
  onReset: () => void;
  pairs?: string[];
  className?: string;
}

export function TradeFilters({
  filters,
  onChange,
  onReset,
  pairs = [],
  className,
}: TradeFiltersProps) {
  const t = useTranslations("trading");

  const hasActiveFilters =
    filters.dateRange !== "30d" ||
    filters.pair !== null ||
    filters.sessionStatus !== "all" ||
    filters.side !== "all" ||
    filters.tradeStatus !== "all" ||
    filters.search !== "";

  return (
    <div
      className={cn(
        SURFACE.BG_CARD,
        "border-white/[0.06] rounded-2xl p-4 hidden md:flex flex-wrap items-center gap-3",
        className,
      )}
      data-testid="trade-filters"
    >
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          type="text"
          placeholder={t("cockpit.trades.filters.placeholder")}
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className="pl-9 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-500"
          data-testid="trade-search-input"
        />
      </div>

      <Select
        value={filters.dateRange}
        onValueChange={(value) =>
          onChange({ dateRange: value as CockpitFilters["dateRange"] })
        }
      >
        <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white min-w-[130px]">
          <SelectValue placeholder={t("cockpit.trades.filters.dateRange")} />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGES.map((range) => (
            <SelectItem key={range} value={range}>
              {t(`cockpit.trades.dateRange.${range}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.pair ?? "all"}
        onValueChange={(value) =>
          onChange({ pair: value === "all" ? null : value })
        }
      >
        <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white min-w-[130px]">
          <SelectValue placeholder={t("cockpit.trades.filters.pair")} />
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

      <Select
        value={filters.side}
        onValueChange={(value) =>
          onChange({ side: value as CockpitFilters["side"] })
        }
      >
        <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white min-w-[110px]">
          <SelectValue placeholder={t("cockpit.trades.filters.side")} />
        </SelectTrigger>
        <SelectContent>
          {SIDES.map((side) => (
            <SelectItem key={side} value={side}>
              {t(`cockpit.trades.filters.${side}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.tradeStatus}
        onValueChange={(value) =>
          onChange({ tradeStatus: value as CockpitFilters["tradeStatus"] })
        }
      >
        <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white min-w-[140px]">
          <SelectValue placeholder={t("cockpit.trades.filters.tradeStatus")} />
        </SelectTrigger>
        <SelectContent>
          {TRADE_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {t(`cockpit.trades.status.${status}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.sessionStatus}
        onValueChange={(value) =>
          onChange({ sessionStatus: value as CockpitFilters["sessionStatus"] })
        }
      >
        <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white min-w-[150px]">
          <SelectValue placeholder={t("cockpit.trades.filters.sessionStatus")} />
        </SelectTrigger>
        <SelectContent>
          {SESSION_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {t(`cockpit.sessions.status.${status}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        disabled={!hasActiveFilters}
        className="text-gray-400 hover:text-white disabled:opacity-40"
        data-testid="trade-filters-reset"
      >
        <RotateCcw className="w-4 h-4 mr-1" />
        {t("cockpit.trades.filters.reset")}
      </Button>
    </div>
  );
}
