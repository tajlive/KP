"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, CrosshairMode, LineStyle, IChartApi, ISeriesApi, CandlestickData, Time } from "lightweight-charts";

interface Trade {
  time: number;
  price: number;
  side: "buy" | "sell";
  pnl?: number;
}

interface LiveChartProps {
  trades?: Trade[];
  symbol?: string;
  height?: number;
  className?: string;
}

export function LiveCandlestickChart({ trades = [], symbol = "BTCUSDT", height = 400, className }: LiveChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markerSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return; // Guard against zero-size container

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#71717A",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
    });
    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22C55E",
      downColor: "#EF4444",
      borderDownColor: "#EF4444",
      borderUpColor: "#22C55E",
      wickDownColor: "#EF4444",
      wickUpColor: "#22C55E",
    });
    candleSeriesRef.current = candleSeries;

    // Buy/sell markers
    const markers = trades
      .filter((t) => t.side)
      .map((t) => ({
        time: t.time as Time,
        position: t.side === "buy" ? "belowBar" as const : "aboveBar" as const,
        color: t.side === "buy" ? "#3B82F6" : "#EF4444",
        shape: t.side === "buy" ? "arrowUp" as const : "arrowDown" as const,
        text: t.side === "buy" ? "KJØP" : "SALG",
        size: 2,
      }));
    candleSeries.setMarkers(markers);

    // Fetch live data
    const fetchData = async () => {
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=5m&limit=100`
        );
        const klines = await res.json();
        const data = klines.map((k: number[]) => ({
          time: Math.floor(k[0] / 1000),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
        }));
        candleSeries.setData(data);
      } catch (e) {
        // Fallback: generate mock data
        const now = Math.floor(Date.now() / 1000);
        const mock = [];
        let price = 66000 + Math.random() * 2000;
        for (let i = 100; i >= 0; i--) {
          const change = (Math.random() - 0.48) * 500;
          const open = price;
          price += change;
          const high = Math.max(open, price) + Math.random() * 200;
          const low = Math.min(open, price) - Math.random() * 200;
          mock.push({
            time: (now - i * 300) as Time,
            open,
            high,
            low,
            close: price,
          });
        }
        candleSeries.setData(mock);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);

    chart.timeScale().fitContent();

    return () => {
      clearInterval(interval);
      chart.remove();
    };
  }, [symbol, height, trades]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", minHeight: height }}
    />
  );
}
