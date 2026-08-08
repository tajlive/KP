"use client";

import { useState, useEffect } from "react";
import { WebSocketManager } from "@/lib/websocket/WebSocketManager";

/**
 * Live-priser for et sett symboler — EU/EØS (2026): Kraken WS eneste kilde.
 * Renner gjennom WebSocketManager (samme singleton som øvrig sanntidskjede).
 */
export function useKrakenPrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>({ USDT: 1.0 });

  useEffect(() => {
    if (symbols.length === 0) return;

    // Filter out standard ones
    const activeSymbols = symbols.filter((s) => s !== "USDT" && s !== "NOK");
    if (activeSymbols.length === 0) return;

    // Interne symboler (f.eks. BTCUSDT) → Kraken-tickers via WebSocketManager
    const unsubscribe = WebSocketManager.getInstance().subscribeToTickers(
      activeSymbols,
      (ticker) => {
        const symbol = ticker.symbol.replace("USDT", "");
        setPrices((prev) => ({
          ...prev,
          [symbol]: ticker.price,
        }));
      },
    );

    return () => unsubscribe();
  }, [symbols.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return prices;
}
