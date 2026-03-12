"use client";

import { useAuth } from "@/components/auth/AuthContext";
import { createClient } from "@/lib/utils";
import {
  AreaData,
  AreaSeries,
  CandlestickData,
  CandlestickSeries,
  IChartApi,
  ISeriesApi,
  LineSeries,
  createChart,
} from "lightweight-charts";
import { Shield, Target, TrendingDown, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type RiskProfile = "forsiktig" | "moderat" | "aggressiv";

interface PortfolioData {
  value: number;
  change: number;
  changePercent: number;
}

interface RiskProfilePulseProps {
  profile?: RiskProfile;
  compact?: boolean;
}

export function RiskProfilePulse({
  profile = "moderat",
  compact = false,
}: RiskProfilePulseProps) {
  const { user } = useAuth();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<
    ISeriesApi<"Area"> | ISeriesApi<"Candlestick"> | null
  >(null);
  const [portfolio, setPortfolio] = useState<PortfolioData>({
    value: 1000000,
    change: 0,
    changePercent: 0,
  });
  // Hydration-safe time display
  const [lastUpdateTime, setLastUpdateTime] = useState<string>("");

  // Update time on client only to prevent hydration mismatch
  useEffect(() => {
    setLastUpdateTime(new Date().toLocaleTimeString("nb-NO"));
    const timeInterval = setInterval(() => {
      setLastUpdateTime(new Date().toLocaleTimeString("nb-NO"));
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  // Fetch portfolio data
  useEffect(() => {
    if (!user) return;

    const fetchPortfolio = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("paper_trading_sessions")
        .select("current_balance, starting_balance")
        .eq("user_id" as any, user.id)
        .eq("status", "active")
        .single() as any;

      if (data) {
        const change = data.current_balance - data.starting_balance;
        const changePercent = (change / data.starting_balance) * 100;
        setPortfolio({
          value: data.current_balance,
          change,
          changePercent,
        });
      }
    };

    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // Chart setup based on risk profile
  useEffect(() => {
    if (!chartContainerRef.current || compact) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.1)" },
        horzLines: { color: "rgba(148, 163, 184, 0.1)" },
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.2)",
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.2)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart as unknown;

    // Different chart types based on risk profile
    if (profile === "forsiktig") {
      // Area chart - smooth, simple
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: "#22c55e",
        topColor: "rgba(34, 197, 94, 0.3)",
        bottomColor: "rgba(34, 197, 94, 0.05)",
        lineWidth: 2,
      });
      seriesRef.current = areaSeries;

      // Generate smooth data
      const data: AreaData[] = [];
      let value = 1000000;
      const now = Date.now() / 1000;
      for (let i = 100; i >= 0; i--) {
        value = value * (1 + (Math.random() - 0.48) * 0.002);
        data.push({
          time: now - i * 300,
          value: Math.round(value),
        } as AreaData);
      }
      areaSeries.setData(data as unknown);
    } else if (profile === "moderat") {
      // Line chart with markers
      const lineSeries = chart.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 2,
      });
      seriesRef.current = lineSeries;

      const data = [];
      let value = 1000000;
      const now = Date.now() / 1000;
      for (let i = 100; i >= 0; i--) {
        value = value * (1 + (Math.random() - 0.48) * 0.004);
        data.push({
          time: now - i * 300,
          value: Math.round(value),
        });
      }
      lineSeries.setData(data as unknown);
    } else {
      // Candlestick for aggressive
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });
      seriesRef.current = candleSeries;

      const data: CandlestickData[] = [];
      let value = 1000000;
      const now = Date.now() / 1000;
      for (let i = 50; i >= 0; i--) {
        const open = value;
        const close = value * (1 + (Math.random() - 0.48) * 0.008);
        const high = Math.max(open, close) * (1 + Math.random() * 0.003);
        const low = Math.min(open, close) * (1 - Math.random() * 0.003);
        data.push({
          time: now - i * 600,
          open: Math.round(open),
          high: Math.round(high),
          low: Math.round(low),
          close: Math.round(close),
        } as CandlestickData);
        value = close;
      }
      candleSeries.setData(data as unknown);
    }

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
    };
  }, [profile, compact]);

  const profileConfig = {
    forsiktig: {
      icon: Shield,
      color: "green",
      bgColor: "bg-green-500/10",
      textColor: "text-green-400",
      label: "Forsiktig",
      description: "Langsiktig vekst med lav risiko",
      updateInterval: "5 min",
    },
    moderat: {
      icon: Target,
      color: "blue",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-400",
      label: "Moderat",
      description: "Balansert risiko/avkastning",
      updateInterval: "1 min",
    },
    aggressiv: {
      icon: Zap,
      color: "orange",
      bgColor: "bg-orange-500/10",
      textColor: "text-orange-400",
      label: "Aggressiv",
      description: "Høy risiko, høy potensiell avkastning",
      updateInterval: "Real-time",
    },
  };

  const config = profileConfig[profile];
  if (!config) return null;
  const Icon = config.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700">
        <Icon className={`w-4 h-4 ${config.textColor}`} />
        <span className="text-sm text-slate-200">
          {portfolio.value.toLocaleString("nb-NO")} kr
        </span>
        <span
          className={`text-xs ${portfolio.change >= 0 ? "text-green-400" : "text-red-400"}`}
        >
          {portfolio.change >= 0 ? "+" : ""}
          {(portfolio.changePercent ?? 0).toFixed(2)}%
        </span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 ${config.bgColor} rounded-xl flex items-center justify-center`}
          >
            <Icon className={`w-5 h-5 ${config.textColor}`} />
          </div>
          <div>
            <h3 className="text-white font-semibold">{config.label}</h3>
            <p className="text-slate-400 text-sm">{config.description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {portfolio.value.toLocaleString("nb-NO")} kr
          </div>
          <div
            className={`flex items-center gap-1 text-sm ${portfolio.change >= 0 ? "text-green-400" : "text-red-400"}`}
          >
            {portfolio.change >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>
              {portfolio.change >= 0 ? "+" : ""}
              {portfolio.change.toLocaleString("nb-NO")} kr (
              {(portfolio.changePercent ?? 0).toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} className="h-64 w-full" />

      {/* Info footer */}
      <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
        <span>Oppdatering: {config.updateInterval}</span>
        <span suppressHydrationWarning>Siste: {lastUpdateTime || "--:--:--"}</span>
      </div>
    </div>
  );
}

// Mini pulse widget for header
export function MiniPulseWidget() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioData>({
    value: 1000000,
    change: 0,
    changePercent: 0,
  });
  const [profile, setProfile] = useState<RiskProfile>("moderat");

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const supabase = createClient();

      // Get portfolio
      const { data: portfolioData } = await supabase
        .from("paper_trading_sessions")
        .select("current_balance, starting_balance")
        .eq("user_id" as any, user.id)
        .eq("status", "active")
        .single() as any;

      if (portfolioData) {
        const change =
          portfolioData.current_balance - portfolioData.starting_balance;
        setPortfolio({
          value: portfolioData.current_balance,
          change,
          changePercent: (change / portfolioData.starting_balance) * 100,
        });
      }

      // Get risk profile
      const { data: profileData } = await supabase
        .from("risk_profiles")
        .select("name")
        .eq("user_id" as any, user.id)
        .single() as any;

      if (profileData) {
        setProfile(profileData.name as RiskProfile);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const profileIcons = {
    forsiktig: Shield,
    moderat: Target,
    aggressiv: Zap,
  };

  const Icon = profileIcons[profile];

  if (!Icon) return null;

  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-full border border-slate-700 transition-colors"
    >
      <Icon
        className={`w-4 h-4 ${
          profile === "forsiktig"
            ? "text-green-400"
            : profile === "moderat"
              ? "text-blue-400"
              : "text-orange-400"
        }`}
      />
      <div className="flex flex-col items-end">
        <span className="text-sm font-medium text-white">
          {((portfolio.value ?? 0) / 1000).toFixed(0)}k kr
        </span>
        <span
          className={`text-xs ${portfolio.change >= 0 ? "text-green-400" : "text-red-400"}`}
        >
          {portfolio.change >= 0 ? "+" : ""}
          {(portfolio.changePercent ?? 0).toFixed(1)}%
        </span>
      </div>
      {/* Sparkline */}
      <svg className="w-12 h-6" viewBox="0 0 48 24">
        <path
          d={`M0,12 ${Array.from({ length: 10 }, (_, i) => {
            const x = (i + 1) * 4.8;
            const y = 12 + (Math.random() - 0.5) * 10;
            return `L${x},${y}`;
          }).join(" ")}`}
          fill="none"
          stroke={portfolio.change >= 0 ? "#22c55e" : "#ef4444"}
          strokeWidth="2"
        />
      </svg>
    </Link>
  );
}
