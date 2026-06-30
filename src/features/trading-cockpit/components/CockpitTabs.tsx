"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import type { CockpitTab } from "@/features/trading-cockpit/types";

interface CockpitTabsProps {
  activeTab: CockpitTab;
  onTabChange: (tab: CockpitTab) => void;
  className?: string;
}

const TABS: CockpitTab[] = ["overview", "trades", "analysis"];

export function CockpitTabs({ activeTab, onTabChange, className }: CockpitTabsProps) {
  const t = useTranslations("trading");

  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as CockpitTab)} className={className}>
      <TabsList className="bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl h-auto">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab}
            value={tab}
            data-testid={`cockpit-tab-${tab}`}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg text-gray-400 data-[state=active]:bg-white/[0.08] data-[state=active]:text-white transition-colors",
            )}
          >
            {t(`cockpit.tab.${tab}`)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
