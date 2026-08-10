"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CockpitMode, CockpitTab } from "@/features/trading-cockpit/types";

const DEFAULT_MODE: CockpitMode = "paper";
const DEFAULT_TAB: CockpitTab = "overview";

export interface UseCockpitUrlSyncResult {
  mode: CockpitMode;
  tab: CockpitTab;
  hasModeParam: boolean;
  hasTabParam: boolean;
  updateUrl: (params: Partial<{ mode: CockpitMode; tab: CockpitTab }>) => void;
}

export function useCockpitUrlSync(): UseCockpitUrlSyncResult {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  const mode: CockpitMode = useMemo(
    () => (searchParams.get("mode") === "live" ? "live" : DEFAULT_MODE),
    [searchParams],
  );

  const tab: CockpitTab = useMemo(() => {
    const value = searchParams.get("tab");
    return value === "trades" || value === "sessions" || value === "analysis"
      ? value
      : DEFAULT_TAB;
  }, [searchParams]);

  const hasModeParam = useMemo(() => searchParams.has("mode"), [searchParams]);

  const hasTabParam = useMemo(() => searchParams.has("tab"), [searchParams]);

  const updateUrl = useCallback(
    (next: Partial<{ mode: CockpitMode; tab: CockpitTab }>) => {
      const params = new URLSearchParams(searchParams.toString());

      // 2026-08-10 (QA P1): Sett ALLTID eksplisitte parametre. Tidligere ble
      // standardverdier slettet fra URL-en — da kunne ikke URL-sync skille
      // «ingen param» (behold server-modus fra profilen) fra «bruker valgte
      // paper», og badge viste Lekepenger mens dataene var live.
      if (next.mode) {
        params.set("mode", next.mode);
      }

      if (next.tab) {
        params.set("tab", next.tab);
      }

      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      router.replace(url, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { mode, tab, hasModeParam, hasTabParam, updateUrl };
}
