"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";

interface TopTrader {
  id: string;
  name: string;
  avatar: string;
  winRate: number;
  totalPnl: number;
  riskScore: number;
  followers: number;
  strategy: string;
  bio: string;
}

// Dummy data for top traders based on Masterplan (Phase 2: Engagement)
const TOP_TRADERS: TopTrader[] = [
  {
    id: "trader_1",
    name: "CryptoKing_NO",
    avatar: "👑",
    winRate: 82.5,
    totalPnl: 145000,
    riskScore: 2,
    followers: 1240,
    strategy: "Trend Balansert (MA50/200)",
    bio: "Sykepleier på dagtid, sving-trader om natten. Kjører sikre, langsiktige posisjoner med lav giring.",
  },
  {
    id: "trader_2",
    name: "AlphaHunter99",
    avatar: "🐺",
    winRate: 64.2,
    totalPnl: 340500,
    riskScore: 5,
    followers: 890,
    strategy: "Multi-Signal Aktiv (15m)",
    bio: "Høy risiko, høy belønning. Kjører breakout strats på AI og Meme-coins. Følg bare med penger du kan tape.",
  },
  {
    id: "trader_3",
    name: "SteadyTurtle",
    avatar: "🐢",
    winRate: 91.0,
    totalPnl: 45000,
    riskScore: 1,
    followers: 2150,
    strategy: "DCA Trygg (KUN BTC/ETH)",
    bio: "Kjedelig trading er lønnsom trading. Rent kjøp og hold med dips-buying. 0% stress.",
  },
];

interface CopyTradingPanelProps {
  onCopyStart: (
    traderId: string,
    riskSettings: Record<string, unknown>,
  ) => void;
  isStarting: boolean;
}

export function CopyTradingPanel({
  onCopyStart,
  isStarting,
}: CopyTradingPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatNOK = (value: number) => {
    return new Intl.NumberFormat("no-NO", {
      style: "currency",
      currency: "NOK",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700/50 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4">
        <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">
          <ShieldCheck className="w-3 h-3" /> AI VERIFISERTE TRADERE
        </span>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-400" />
          Kopier Topp-Tradere
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          La ekspertene gjøre jobben. Systemet kopierer automatisk deres handler
          proporsjonalt til din saldo.
        </p>
      </div>

      <div className="space-y-4">
        {TOP_TRADERS.map((trader, index) => {
          const isExpanded = expandedId === trader.id;

          return (
            <motion.div
              key={trader.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-700/50 rounded-xl border border-slate-600 hover:border-blue-500/50 transition-colors overflow-hidden"
            >
              <div
                role="button"
                tabIndex={0}
                className="p-4 cursor-pointer flex items-center justify-between"
                onClick={() => setExpandedId(isExpanded ? null : trader.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedId(isExpanded ? null : trader.id);
                  }
                }}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? "Lukk trader" : "Utvid trader"}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-2xl border-2 border-slate-600 shadow-inner">
                    {trader.avatar}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">
                      {trader.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-400">{trader.strategy}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {trader.followers} følgere
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-slate-400">
                      Total P&L
                    </p>
                    <p className="font-bold text-emerald-400">
                      +{formatNOK(trader.totalPnl)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-400">
                      Win Rate
                    </p>
                    <p className="font-bold text-white flex items-center gap-1 justify-end">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      {trader.winRate}%
                    </p>
                  </div>
                  <div className="text-slate-400">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-600/50 bg-slate-800/80"
                  >
                    <div className="p-4 space-y-4">
                      <p className="text-sm text-slate-300 italic flex gap-2">
                        <span className="text-slate-500">"</span>
                        {trader.bio}
                        <span className="text-slate-500">"</span>
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-900/50 rounded-lg">
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-semibold">
                            Risiko Score
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="font-bold text-white">
                              {trader.riskScore}/5
                            </span>
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-full ${i < trader.riskScore ? (trader.riskScore > 3 ? "bg-red-500" : trader.riskScore > 1 ? "bg-amber-400" : "bg-emerald-400") : "bg-slate-700"}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-semibold">
                            Min. Investering
                          </p>
                          <p className="font-bold text-white">5 000 NOK</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-semibold">
                            Avg. Hold Time
                          </p>
                          <p className="font-bold text-white">
                            {trader.riskScore > 3 ? "1.5 dager" : "14 dager"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-semibold">
                            Max Drawdown
                          </p>
                          <p className="font-bold text-white">
                            -{trader.riskScore * 4.2}%
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          onCopyStart(trader.id, {
                            maxLoss: 1000,
                            maxPerTrade: 500,
                          })
                        }
                        disabled={isStarting}
                        className="w-full py-3 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isStarting ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Copy className="w-5 h-5" /> Kopier {trader.name}{" "}
                            Automatisk
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
