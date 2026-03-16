"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  LineSeries,
  AreaSeries,
  Time,
  LineStyle,
} from "lightweight-charts";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PulseData {
  time: number;
  value: number;
  sentiment: "bullish" | "bearish" | "neutral";
}

interface RiskProfile {
  name: string;
  description: string;
  volatility: number;
  color: string;
  maxDrawdown: string;
  expectedReturn: string;
}

const RISK_PROFILES: RiskProfile[] = [
  {
    name: "Konservativ",
    description: "Lav risiko, stabil vekst",
    volatility: 0.3,
    color: "#10B981",
    maxDrawdown: "-5%",
    expectedReturn: "5-10%",
  },
  {
    name: "Balansert",
    description: "Moderat risiko, balansert avkastning",
    volatility: 0.5,
    color: "#3B82F6",
    maxDrawdown: "-15%",
    expectedReturn: "10-20%",
  },
  {
    name: "Agressiv",
    description: "Høy risiko, høy potensiell avkastning",
    volatility: 0.8,
    color: "#F59E0B",
    maxDrawdown: "-30%",
    expectedReturn: "20-50%",
  },
];

export function PulseChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const [selectedProfile, setSelectedProfile] = useState(1); // Balansert default
  const [pulseData, setPulseData] = useState<PulseData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Generate simulated pulse data
  const generatePulseData = (profile: RiskProfile): PulseData[] => {
    const data: PulseData[] = [];
    let value = 100;
    const now = Date.now() / 1000;
    
    for (let i = 100; i >= 0; i--) {
      const time = Math.floor(now - i * 3600); // Hourly data
      const change = (Math.random() - 0.5) * profile.volatility * 2;
      value = Math.max(50, Math.min(150, value * (1 + change * 0.01)));
      
      let sentiment: "bullish" | "bearish" | "neutral" = "neutral";
      if (change > 0.3) sentiment = "bullish";
      else if (change < -0.3) sentiment = "bearish";
      
      data.push({ time, value, sentiment });
    }
    return data;
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const profile = RISK_PROFILES[selectedProfile];
    const data = generatePulseData(profile);
    setPulseData(data);

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9CA3AF",
      },
      grid: {
        vertLines: { 
          color: "rgba(31, 41, 55, 0.3)",
          style: LineStyle.Dotted,
        },
        horzLines: { 
          color: "rgba(31, 41, 55, 0.3)",
          style: LineStyle.Dotted,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#374151",
      },
      rightPriceScale: {
        borderColor: "#374151",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#6B7280",
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: "#6B7280",
          width: 1,
          style: LineStyle.Dashed,
        },
      },
    });

    chartRef.current = chart;

    // Add area series
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: profile.color,
      topColor: `${profile.color}40`,
      bottomColor: `${profile.color}05`,
      lineWidth: 2,
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });

    areaSeriesRef.current = areaSeries;

    // Set data
    const chartData = data.map(d => ({
      time: d.time as Time,
      value: d.value,
    }));

    areaSeries.setData(chartData);
    chart.timeScale().fitContent();

    // Handle resize
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
  }, [selectedProfile]);

  // Real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      const profile = RISK_PROFILES[selectedProfile];
      const lastValue = pulseData[pulseData.length - 1]?.value || 100;
      const change = (Math.random() - 0.5) * profile.volatility * 0.5;
      const newValue = Math.max(50, Math.min(150, lastValue * (1 + change * 0.01)));
      
      const newData: PulseData = {
        time: Math.floor(Date.now() / 1000),
        value: newValue,
        sentiment: change > 0 ? "bullish" : change < 0 ? "bearish" : "neutral",
      };
      
      setPulseData(prev => [...prev.slice(-99), newData]);
      
      if (areaSeriesRef.current) {
        areaSeriesRef.current.update({
          time: newData.time as Time,
          value: newData.value,
        });
      }
      
      setLastUpdate(new Date());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [selectedProfile, pulseData]);

  const currentPulse = pulseData[pulseData.length - 1];
  const previousPulse = pulseData[pulseData.length - 2];
  const pulseChange = currentPulse && previousPulse
    ? ((currentPulse.value - previousPulse.value) / previousPulse.value) * 100
    : 0;

  const profile = RISK_PROFILES[selectedProfile];

  return (
    <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-bold">Markedspuls</h3>
              <p className="text-slate-400 text-sm">Live sentiment-analyse</p>
            </div>
          </div>
          
          {/* Pulse indicator */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {currentPulse?.value.toFixed(1) || "100.0"}
              </div>
              <div className={`flex items-center gap-1 text-sm ${
                pulseChange >= 0 ? "text-green-400" : "text-red-400"
              }`}>
                {pulseChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {pulseChange >= 0 ? "+" : ""}{pulseChange.toFixed(2)}%
              </div>
            </div>
            <div className={`w-3 h-3 rounded-full animate-pulse ${
              currentPulse?.sentiment === "bullish" ? "bg-green-500" :
              currentPulse?.sentiment === "bearish" ? "bg-red-500" : "bg-yellow-500"
            }`} />
          </div>
        </div>

        {/* Risk Profile Selector */}
        <div className="mt-6">
          <p className="text-slate-400 text-sm mb-3">Velg risikoprofil:</p>
          <div className="grid grid-cols-3 gap-3">
            {RISK_PROFILES.map((p, index) => (
              <button
                key={p.name}
                onClick={() => setSelectedProfile(index)}
                className={`p-4 rounded-xl border transition-all text-left ${
                  selectedProfile === index
                    ? `border-${p.color === "#10B981" ? "green" : p.color === "#3B82F6" ? "blue" : "orange"}-500 bg-white/5`
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className={`font-semibold ${
                    selectedProfile === index ? "text-white" : "text-slate-400"
                  }`}>
                    {p.name}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{p.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} className="w-full" />

      {/* Stats */}
      <div className="p-6 border-t border-white/10">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">Maks Drawdown</div>
            <div className="text-lg font-bold text-white">{profile.maxDrawdown}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">Forventet avkastning</div>
            <div className="text-lg font-bold" style={{ color: profile.color }}>
              {profile.expectedReturn}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">Volatilitet</div>
            <div className="text-lg font-bold text-white">{Math.round(profile.volatility * 100)}%</div>
          </div>
        </div>
        
        <div className="mt-4 text-center text-xs text-slate-500">
          Sist oppdatert: {lastUpdate.toLocaleTimeString('nb-NO')}
        </div>
      </div>
    </div>
  );
}
