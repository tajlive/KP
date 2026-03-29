"use client";

import { createContext, useContext, useState, useCallback } from "react";

export interface TradeData {
  symbol: string;
  amount: number;
  direction: "BUY" | "SELL";
  nokValue: number;
}

interface TradeSuccessContextType {
  isOpen: boolean;
  tradeData: TradeData | null;
  showSuccess: (data: TradeData) => void;
  hideSuccess: () => void;
}

const TradeSuccessContext = createContext<TradeSuccessContextType | null>(null);

export function TradeSuccessProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tradeData, setTradeData] = useState<TradeData | null>(null);

  const showSuccess = useCallback((data: TradeData) => {
    setTradeData(data);
    setIsOpen(true);
  }, []);

  const hideSuccess = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setTradeData(null), 300);
  }, []);

  return (
    <TradeSuccessContext.Provider
      value={{ isOpen, tradeData, showSuccess, hideSuccess }}
    >
      {children}
    </TradeSuccessContext.Provider>
  );
}

export function useTradeSuccess(): TradeSuccessContextType {
  const context = useContext(TradeSuccessContext);
  if (context === null) {
    throw new Error(
      "useTradeSuccess must be used within a TradeSuccessProvider"
    );
  }
  return context;
}
