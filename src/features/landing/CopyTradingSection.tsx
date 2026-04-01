"use client";

import { Button } from "@/shared/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Trophy, UserCheck, Users, Zap } from "lucide-react";
import { useEffect, useState } from "react";

interface LeaderboardData {
  username?: string;
  totalPnl?: number;
  totalTrades?: number;
  winRate?: number;
  tier?: string;
}

const MOCK_TRADERS = [
  {
    name: "Nordic Whale",
    profit: "+184%",
    trades: 1420,
    winRate: "78%",
    level: "Pro",
  },
  {
    name: "Crypto King",
    profit: "+122%",
    trades: 856,
    winRate: "64%",
    level: "Active",
  },
  {
    name: "Algo Master",
    profit: "+98%",
    trades: 2104,
    winRate: "82%",
    level: "Expert",
  },
];

export function CopyTradingSection() {
  const [topTraders, setTopTraders] = useState(MOCK_TRADERS);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch(
          "/api/auto-trading/leaderboard?timeframe=all_time&limit=3",
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.leaderboard?.length > 0) {
          setTopTraders(
            data.leaderboard.map((e: LeaderboardData, i: number) => ({
              name: e.username || MOCK_TRADERS[i]?.name || `Trader${i}`,
              profit: `+${((e.totalPnl || 0) / 1000).toFixed(1)}%`,
              trades: e.totalTrades || MOCK_TRADERS[i]?.trades || 0,
              winRate: `${e.winRate || MOCK_TRADERS[i]?.winRate}%`,
              level: e.tier
                ? e.tier.charAt(0).toUpperCase() + e.tier.slice(1)
                : MOCK_TRADERS[i]?.level,
            })),
          );
        }
      } catch {
        // Keep mock data on error
      }
    }
    fetchLeaderboard();
  }, []);
  return (
    <div className="bg-white rounded-[40px] p-8 md:p-12 border border-slate-100 shadow-2xl relative overflow-hidden">
      <div className="flex flex-col md:flex-row gap-12 items-center">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-sm font-bold">
            <Users className="h-4 w-4" /> SOCIAL TRADING
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 leading-tight">
            Kopier de Beste. <br />
            <span className="text-blue-600">Med ett klikk.</span>
          </h2>
          <p className="text-lg text-slate-600">
            Ikke kast bort tid på å lære alt selv. Velg en av de mest
            suksessfulle tradere i vårt community og la roboten din speile deres
            handler automatisk.
          </p>

          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="mt-1 bg-green-100 p-1 rounded-full">
                <UserCheck className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <span className="font-bold text-slate-900">Full kontroll.</span>{" "}
                Du ser nøyaktig hva som skjer og kan stoppe når som helst.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 bg-blue-100 p-1 rounded-full">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <span className="font-bold text-slate-900">Ett klikk.</span>{" "}
                Ingen kompliserte instillinger. Trykk "Kopier" og du er i gang.
              </div>
            </li>
          </ul>

          <Button
            size="lg"
            className="bg-slate-900 text-white hover:bg-slate-800 h-14 px-8 rounded-2xl text-lg font-bold shadow-xl"
          >
            Finn din Master Trader <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 w-full max-w-md space-y-4">
          <div className="text-center mb-6">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Topp Tradere denne uken
            </span>
          </div>

          {topTraders.map((trader, i) => (
            <motion.div
              key={i}
              whileHover={{ x: 10 }}
              className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-white hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-100 to-indigo-100 flex items-center justify-center relative">
                  <Trophy
                    className={`h-5 w-5 ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : "text-amber-700"}`}
                  />
                </div>
                <div>
                  <div className="font-bold text-slate-900">{trader.name}</div>
                  <div className="text-xs text-slate-500">
                    {trader.level} • {trader.trades} trades
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-black text-green-600">
                  {trader.profit}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-3 text-[10px] uppercase font-bold text-blue-600 group-hover:bg-blue-600 group-hover:text-white rounded-full transition-all"
                >
                  KOPIER
                </Button>
              </div>
            </motion.div>
          ))}

          <div className="bg-blue-600/5 p-4 rounded-2xl border border-blue-600/10 text-center">
            <p className="text-xs text-blue-600 font-medium">
              Join 2,400+ andre brukere som kopierer strategier i dag.
            </p>
          </div>
        </div>
      </div>

      {/* Background Decor */}
      <div className="absolute bottom-[-100px] right-[-100px] w-64 h-64 bg-blue-100/50 rounded-full blur-3xl" />
    </div>
  );
}
