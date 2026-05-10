"use client";

import { useState, useEffect, useRef } from "react";

export function useBinancePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>({ USDT: 1.0 });
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (symbols.length === 0) return;

    // Filter out standard ones
    const activeSymbols = symbols.filter(s => s !== "USDT" && s !== "NOK");
    if (activeSymbols.length === 0) return;

    const streams = activeSymbols.map(s => `${s.toLowerCase()}usdt@ticker`).join("/");
    const url = `wss://stream.binance.com:9443/ws/${streams}`;

    const connect = () => {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const symbol = data.s.replace("USDT", "");
        const price = parseFloat(data.c);

        setPrices(prev => ({
          ...prev,
          [symbol]: price
        }));
      };

      ws.onerror = (err) => {
        console.error("Binance WebSocket error:", err);
      };

      ws.onclose = () => {
        // Reconnect after 5 seconds
        setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [symbols]);

  return prices;
}
