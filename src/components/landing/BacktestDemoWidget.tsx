"use client";

import { Button } from "@/components/ui/button";
import { BarChart3, Play, ShieldCheck, TrendingUp, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DemoPoint {
  day: number;
  value: number;
  date: string;
}

interface DemoData {
  hodl: DemoPoint[];
  dca: DemoPoint[];
  grid: DemoPoint[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data Generators for Demo
// ─────────────────────────────────────────────────────────────────────────────

function generateData(
  days: number,
  volatility: number,
  trend: number,
  startAmount: number,
): DemoPoint[] {
  let current = startAmount;
  const data: DemoPoint[] = [];
  for (let i = 0; i < days; i++) {
    const dailyChange = (Math.random() - 0.5) * volatility + trend;
    current = current * (1 + dailyChange / 100);
    data.push({
      day: i,
      value: Math.round(current),
      date: new Date(
        Date.now() - (days - i) * 24 * 60 * 60 * 1000,
      ).toLocaleDateString("no-NO", { day: "2-digit", month: "short" }),
    });
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function BacktestDemoWidget() {
  const locale = useLocale();
  const [demoData, setDemoData] = useState<DemoData | null>(null);
  const [investment, setInvestment] = useState<number>(50000);
  const [strategy, setStrategy] = useState<"hodl" | "dca" | "grid">("grid");
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 90
  const days = 90;

  // Initialize data on client only
  useEffect(() => {
    setDemoData({
      hodl: generateData(90, 4, 0.1, 10000),
      dca: generateData(90, 2, 0.3, 10000),
      grid: generateData(90, 1.5, 0.4, 10000),
    });
    setProgress(89); // Set to full progress by default
  }, []);

  // Animation loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((p) => {
          if (p >= days - 1) {
            setIsPlaying(false);
            return days - 1;
          }
          return p + 1;
        });
      }, 50); // 50ms per day = ~4.5 seconds for 90 days
    }
    return () => clearInterval(interval);
  }, [isPlaying, days]);

  const handlePlay = () => {
    setProgress(0);
    setIsPlaying(true);
  };

  const currentData =
    demoData && demoData[strategy]
      ? demoData[strategy].slice(0, progress + 1).map((d) => ({
          ...d,
          value: Math.round((d.value / 10000) * investment), // Scale to chosen investment
        }))
      : [];

  const endValue =
    currentData.length > 0
      ? currentData[currentData.length - 1].value
      : investment;
  const profit = endValue - investment;
  const profitPercent = (profit / investment) * 100;

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { payload: { date: string }; value: number }[];
  }) => {
    if (active && payload && payload.length > 0) {
      return (
        <div className="bg-slate-900 border border-slate-700 text-white p-3 rounded-lg shadow-xl text-sm">
          <div className="text-slate-400 mb-1">{payload[0].payload.date}</div>
          <div className="font-bold text-lg">
            {new Intl.NumberFormat("no-NO").format(payload[0].value)} kr
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <section
      id="demo"
      className="py-24 px-4 bg-slate-50 relative overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-green-100/50 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold mb-6">
            <BarChart3 className="w-4 h-4" />
            LIVE SIMULATOR
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            Slå markedet automatisk.
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Se hvordan roboter håndterer urolige markeder bedre enn mennesker.
            Test med historiske data fra de siste 90 dagene.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Controls Panel */}
          <div className="lg:col-span-4 bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100 relative z-10">
            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-700 mb-4">
                Hva ville du investert for 3 mnd siden?
              </label>
              <div className="text-4xl font-black text-blue-600 mb-4">
                {new Intl.NumberFormat("no-NO").format(investment)}{" "}
                <span className="text-lg text-blue-400">NOK</span>
              </div>
              <input
                type="range"
                min="10000"
                max="500000"
                step="10000"
                value={investment}
                onChange={(e) => {
                  setInvestment(Number(e.target.value));
                  if (!isPlaying) setProgress(days - 1);
                }}
                disabled={isPlaying}
                className="w-full appearance-none bg-slate-100 h-2 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full cursor-pointer disabled:opacity-50"
              />
            </div>

            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-700 mb-4">
                Velg strategi
              </label>
              <div className="space-y-3">
                <StrategyBtn
                  id="hodl"
                  title="Kjøp & Hold (Bitcoin)"
                  desc="Du kjøper BTC og lar den stå."
                  icon={ShieldCheck}
                  active={strategy === "hodl"}
                  onClick={() => {
                    setStrategy("hodl");
                    if (!isPlaying) setProgress(days - 1);
                  }}
                  disabled={isPlaying}
                />
                <StrategyBtn
                  id="dca"
                  title="Klarpakke DCA"
                  desc="Roboten kjøper mer når prisen faller."
                  icon={TrendingUp}
                  active={strategy === "dca"}
                  onClick={() => {
                    setStrategy("dca");
                    if (!isPlaying) setProgress(days - 1);
                  }}
                  disabled={isPlaying}
                />
                <StrategyBtn
                  id="grid"
                  title="Klarpakke Grid"
                  desc="Kjøper lavt, selger høyt automatisk."
                  icon={Zap}
                  active={strategy === "grid"}
                  onClick={() => {
                    setStrategy("grid");
                    if (!isPlaying) setProgress(days - 1);
                  }}
                  disabled={isPlaying}
                />
              </div>
            </div>

            <Button
              onClick={handlePlay}
              disabled={isPlaying}
              className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-lg font-bold"
            >
              {isPlaying ? (
                <span className="animate-pulse">
                  Simulerer {progress}/90 dager...
                </span>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2 fill-current" /> Kjør Backtest
                </>
              )}
            </Button>
          </div>

          {/* Chart & Results Panel */}
          <div className="lg:col-span-8 space-y-6">
            {/* Chart Area */}
            <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 relative h-[400px]">
              <div className="absolute top-6 left-8 z-10">
                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Porteføljeverdi
                </div>
                <div className="text-3xl font-black text-slate-900">
                  {new Intl.NumberFormat("no-NO").format(endValue)} kr
                </div>
              </div>

              <div className="w-full h-full pt-16" style={{ minHeight: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentData}>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={["dataMin - 1000", "dataMax + 1000"]} hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={
                        strategy === "hodl"
                          ? "#94a3b8"
                          : strategy === "dca"
                            ? "#3b82f6"
                            : "#22c55e"
                      }
                      strokeWidth={4}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Progress Line */}
              <div className="absolute bottom-6 left-6 right-6 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-300 transition-all duration-75"
                  style={{ width: `${(progress / (days - 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ResultCard
                label="Avkastning"
                value={`${profit > 0 ? "+" : ""}${new Intl.NumberFormat("no-NO").format(profit)} kr`}
                trend={profit >= 0 ? "up" : "down"}
              />
              <ResultCard
                label="Prosent"
                value={`${profitPercent > 0 ? "+" : ""}${profitPercent.toFixed(1)}%`}
                trend={profitPercent >= 0 ? "up" : "down"}
              />
              <ResultCard label="Tid" value="90 dager" trend="neutral" />
              <div className="flex items-center justify-center p-4">
                <Button
                  className="w-full h-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20"
                  onClick={() => (window.location.href = `/${locale}/onboarding`)}
                >
                  Start din bot →
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StrategyBtn({
  title,
  desc,
  icon: Icon,
  active,
  onClick,
  disabled,
}: {
  id?: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${
        active
          ? "border-blue-600 bg-blue-50/50 shadow-md"
          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div
        className={`p-2 rounded-lg ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div
          className={`font-bold ${active ? "text-blue-900" : "text-slate-700"}`}
        >
          {title}
        </div>
        <div className="text-xs text-slate-500 mt-0.5 leading-tight">
          {desc}
        </div>
      </div>
    </button>
  );
}

function ResultCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: "up" | "down" | "neutral";
}) {
  return (
    <div className="bg-white rounded-[1.5rem] p-5 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-center">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className={`text-xl md:text-2xl font-black ${
          trend === "up"
            ? "text-green-600"
            : trend === "down"
              ? "text-red-600"
              : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
