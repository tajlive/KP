"use client";

import { PresetProfileId } from "@/lib/auto-trading/preset-profiles";
import { PulseChartData, PulseEvent } from "@/types/pulse";
import {
  AreaSeries,
  ColorType,
  IChartApi,
  LineSeries,
  LineStyle,
  SeriesMarker,
  Time,
  createChart,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

export interface PulseChartProps {
  data: PulseChartData[];
  events: PulseEvent[];
  profileId: PresetProfileId;
  isLoading?: boolean;
}

export function PulseChart({
  data,
  events,
  profileId,
  isLoading,
}: PulseChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
        fontFamily: "Lexend, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.05)" },
        horzLines: { color: "rgba(148, 163, 184, 0.05)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.1)",
        autoScale: true,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "rgba(148, 163, 184, 0.5)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1e293b",
        },
        horzLine: {
          color: "rgba(148, 163, 184, 0.5)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1e293b",
        },
      },
    });

    chartRef.current = chart;

    // Handle Resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || isLoading) return;

    // Remove old series if it exists
    const chart = chartRef.current;
    if (!chart) return;
    
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
    }

    // Adaptive visualization based on profile
    let series: ReturnType<IChartApi['addSeries']> | null = null;

    if (profileId === "forsiktig") {
      // Area Chart - Smooth and safe
      series = chart.addSeries(AreaSeries, {
        lineColor: "#22c55e",
        topColor: "rgba(34, 197, 94, 0.2)",
        bottomColor: "rgba(34, 197, 94, 0.0)",
        lineWidth: 3,
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      });
    } else if (profileId === "moderat") {
      // Line Chart - Balanced
      series = chart.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 3,
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      });
    } else {
      // Candlestick - Aggressive/Professional
      series = chart.addSeries(AreaSeries, {
        lineColor: "#f59e0b",
        topColor: "rgba(245, 158, 11, 0.3)",
        bottomColor: "rgba(245, 158, 11, 0.05)",
        lineWidth: 4,
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      });
    }

    seriesRef.current = series;

    // Set Data
    series?.setData(data as any);

    // Add Event Markers
    const markers: SeriesMarker<Time>[] = (events || []).map((event) => ({
      time: event.time as number as Time,
      position: event.type === "buy" ? "belowBar" : "aboveBar",
      color: event.type === "buy" ? "#22c55e" : "#ef4444",
      shape: event.type === "buy" ? "arrowUp" : "arrowDown",
      text: event.type === "buy" ? "BUY" : "SELL",
      size: 1,
    }));

    if (series && 'setMarkers' in series) {
      (series as any).setMarkers(markers);
    }

    chart.timeScale().fitContent();
  }, [data, events, profileId, isLoading]);

  return (
    <div className="relative w-full h-[400px]">
      <div ref={chartContainerRef} className="w-full h-full" />
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
