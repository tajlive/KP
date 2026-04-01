"use client";

import { createContext, useContext, type ReactNode } from "react";

type VippsMarketContextValue = { showVipps: boolean };

const VippsMarketContext = createContext<VippsMarketContextValue>({
  showVipps: false,
});

export function VippsMarketProvider({
  showVippsMarket,
  children,
}: {
  showVippsMarket: boolean;
  children: ReactNode;
}) {
  return (
    <VippsMarketContext.Provider value={{ showVipps: showVippsMarket }}>
      {children}
    </VippsMarketContext.Provider>
  );
}

export function useVippsMarket() {
  return useContext(VippsMarketContext);
}
