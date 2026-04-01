"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

interface MarketBrief {
  summary: string;
  sentiment: "bullish" | "bearish" | "neutral";
  highlights: string[];
  generated_at: string;
}

const sentimentConfig = {
  bullish: {
    icon: TrendingUp,
    color: "text-emerald-400",
    bg: "from-emerald-900/40 to-emerald-800/20",
    border: "border-emerald-500/30",
    label: "🟢 Bullish",
  },
  bearish: {
    icon: TrendingDown,
    color: "text-red-400",
    bg: "from-red-900/40 to-red-800/20",
    border: "border-red-500/30",
    label: "🔴 Bearish",
  },
  neutral: {
    icon: Minus,
    color: "text-blue-400",
    bg: "from-blue-900/40 to-blue-800/20",
    border: "border-blue-500/30",
    label: "🔵 Nøytral",
  },
};

export default function AIMarketBrief() {
  const [brief, setBrief] = useState<MarketBrief | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBrief = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/market-brief");
      const data = await res.json();
      setBrief(data);
    } catch {
      setBrief(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrief();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-linear-to-br from-slate-900 to-slate-800 p-6 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-5 w-5 text-blue-400" />
          <div className="h-4 w-32 bg-slate-700 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full bg-slate-700 rounded" />
          <div className="h-3 w-3/4 bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  if (!brief) return null;

  const config = sentimentConfig[brief.sentiment];
  if (!config) return null;
  
  const SentimentIcon = config.icon;
  if (!SentimentIcon) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${config.border} bg-linear-to-br ${config.bg} p-6 backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">AI Market Brief</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium ${config.color} flex items-center gap-1`}
          >
            <SentimentIcon className="h-3.5 w-3.5" />
            {config.label}
          </span>
          <button
            onClick={fetchBrief}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            title="Oppdater"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed mb-4">
        {brief.summary}
      </p>

      {brief.highlights.length > 0 && (
        <ul className="space-y-1.5">
          {brief.highlights.map((h, i) => (
            <li
              key={i}
              className="text-xs text-slate-400 flex items-start gap-2"
            >
              <span className="text-blue-400 mt-0.5">•</span>
              {h}
            </li>
          ))}
        </ul>
      )}

      {brief.generated_at && (
        <p className="text-[10px] text-slate-600 mt-3">
          Oppdatert:{" "}
          {new Date(brief.generated_at).toLocaleString("no-NO", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </motion.div>
  );
}
