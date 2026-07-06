"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { SlidersHorizontal, RotateCcw, X } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";
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

  const activeFilterChips = React.useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];

    if (filters.search) {
      chips.push({
        key: "search",
        label: filters.search,
        onRemove: () => onChange({ search: "" }),
      });
    }

    if (filters.dateRange !== "30d") {
      chips.push({
        key: "dateRange",
        label: t(`cockpit.trades.dateRange.${filters.dateRange}`),
        onRemove: () => onChange({ dateRange: "30d" }),
      });
    }

    if (filters.pair) {
      chips.push({
        key: "pair",
        label: filters.pair,
        onRemove: () => onChange({ pair: null }),
      });
    }

    if (filters.side !== "all") {
      chips.push({
        key: "side",
        label: t(`cockpit.trades.filters.${filters.side}`),
        onRemove: () => onChange({ side: "all" }),
      });
    }

    if (filters.tradeStatus !== "all") {
      chips.push({
        key: "tradeStatus",
        label: t(`cockpit.trades.status.${filters.tradeStatus}`),
        onRemove: () => onChange({ tradeStatus: "all" }),
      });
    }

    if (filters.sessionStatus !== "all") {
      chips.push({
        key: "sessionStatus",
        label: t(`cockpit.sessions.status.${filters.sessionStatus}`),
        onRemove: () => onChange({ sessionStatus: "all" }),
      });
    }

    return chips;
  }, [filters, onChange, t]);

  const hasActiveFilters = activeFilterChips.length > 0;

  return (
    <div className={cn("md:hidden", className)} data-testid="trade-filters-sheet-trigger">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="default"
          onClick={() => setOpen(true)}
          className="flex-1 min-h-12 border-kp-border text-kp-text-primary hover:bg-kp-secondary/10"
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          {t("cockpit.trades.filters.open")}
          {hasActiveFilters && (
            <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-kp-brand px-1.5 text-xs font-medium text-white">
              {activeFilterChips.length}
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onReset}
            className="h-12 w-12 shrink-0 text-kp-text-secondary hover:text-kp-text-primary"
            aria-label={t("cockpit.trades.filters.reset")}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeFilterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1.5 rounded-full border border-kp-light bg-kp-tertiary px-3 py-1.5 text-sm text-kp-text-primary min-h-8 touch-manipulation"
              aria-label={`${t("cockpit.trades.filters.remove")} ${chip.label}`}
            >
              {chip.label}
              <X className="h-3.5 w-3.5 text-kp-text-secondary" />
            </button>
          ))}
        </div>
      )}

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
              className="flex-1 min-h-12 text-kp-text-secondary hover:text-kp-text-primary disabled:opacity-40"
              data-testid="trade-filters-sheet-reset"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              {t("cockpit.trades.filters.reset")}
            </Button>
            <Button
              size="sm"
              onClick={() => setOpen(false)}
              className="flex-1 min-h-12 bg-kp-brand text-white hover:bg-kp-brand-hover"
            >
              {t("cockpit.trades.filters.apply")}
            </Button>
          </div>
        }
      >
        <div className="space-y-5 pb-2">
          <div className="space-y-2">
            <Label className="text-sm text-kp-text-secondary">{t("cockpit.trades.filters.search")}</Label>
            <Input
              type="text"
              placeholder={t("cockpit.trades.filters.placeholder")}
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              className="min-h-12 bg-kp-tertiary border-kp-border text-kp-text-primary placeholder:text-kp-text-muted"
              data-testid="trade-mobile-search-input"
            />
          </div>

          <CollapsibleSection title={t("cockpit.trades.filters.dateRange")}>
            <div className="grid grid-cols-3 gap-2">
              {DATE_RANGES.map((range) => (
                <FilterPill
                  key={range}
                  active={filters.dateRange === range}
                  onClick={() => onChange({ dateRange: range })}
                  label={t(`cockpit.trades.dateRange.${range}`)}
                />
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={t("cockpit.trades.filters.pair")}>
            <Select
              value={filters.pair ?? "all"}
              onValueChange={(value) =>
                onChange({ pair: value === "all" ? null : value })
              }
            >
              <SelectTrigger className="min-h-12 bg-kp-tertiary border-kp-border text-kp-text-primary">
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
          </CollapsibleSection>

          <CollapsibleSection title={t("cockpit.trades.filters.side")}>
            <div className="grid grid-cols-3 gap-2">
              {SIDES.map((side) => (
                <FilterPill
                  key={side}
                  active={filters.side === side}
                  onClick={() => onChange({ side: side })}
                  label={t(`cockpit.trades.filters.${side}`)}
                />
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={t("cockpit.trades.filters.tradeStatus")}>
            <div className="grid grid-cols-2 gap-2">
              {TRADE_STATUSES.map((status) => (
                <FilterPill
                  key={status}
                  active={filters.tradeStatus === status}
                  onClick={() => onChange({ tradeStatus: status })}
                  label={t(`cockpit.trades.status.${status}`)}
                />
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={t("cockpit.trades.filters.sessionStatus")}>
            <div className="grid grid-cols-2 gap-2">
              {SESSION_STATUSES.map((status) => (
                <FilterPill
                  key={status}
                  active={filters.sessionStatus === status}
                  onClick={() => onChange({ sessionStatus: status })}
                  label={t(`cockpit.sessions.status.${status}`)}
                />
              ))}
            </div>
          </CollapsibleSection>
        </div>
      </MobileBottomSheet>
    </div>
  );
}

function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-left text-sm font-medium text-kp-text-primary min-h-12 touch-manipulation">
        {title}
        <span
          className={cn(
            "text-kp-text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
        >
          ▼
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <div className="pb-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2.5 text-sm font-medium min-h-12 touch-manipulation transition-colors",
        active
          ? "border-kp-brand bg-kp-brand-subtle text-kp-brand"
          : "border-kp-light bg-kp-tertiary text-kp-text-primary hover:bg-kp-secondary/10",
      )}
    >
      {label}
    </button>
  );
}
