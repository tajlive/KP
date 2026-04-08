"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { nb, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";

interface LiveTrade {
  id: string;
  userName: string;
  userInitials: string;
  symbol: string;
  side: "buy" | "sell";
  pnl: number;
  strategy: string;
  time: Date;
  countryCode?: string;
}

interface LiveTradeFeedProps {
  limit?: number;
  showHeader?: boolean;
}

// Mock-data for demo
const MOCK_TRADES: LiveTrade[] = [
  {
    id: "1",
    userName: "CryptoViking",
    userInitials: "CV",
    symbol: "BTC/USDT",
    side: "buy",
    pnl: 5.2,
    strategy: "DCA Trygg",
    time: new Date(Date.now() - 1000 * 60 * 2),
    countryCode: "NO",
  },
  {
    id: "2",
    userName: "MoonShot",
    userInitials: "MS",
    symbol: "ETH/USDT",
    side: "sell",
    pnl: 3.8,
    strategy: "Trend Balansert",
    time: new Date(Date.now() - 1000 * 60 * 5),
    countryCode: "SE",
  },
  {
    id: "3",
    userName: "DCA_Master",
    userInitials: "DM",
    symbol: "SOL/USDT",
    side: "buy",
    pnl: -1.2,
    strategy: "Grid Bot",
    time: new Date(Date.now() - 1000 * 60 * 8),
    countryCode: "DK",
  },
  {
    id: "4",
    userName: "BitcoinQueen",
    userInitials: "BQ",
    symbol: "BTC/USDT",
    side: "buy",
    pnl: 8.5,
    strategy: "Multi-Signal",
    time: new Date(Date.now() - 1000 * 60 * 12),
    countryCode: "NO",
  },
  {
    id: "5",
    userName: "TradingPro",
    userInitials: "TP",
    symbol: "ETH/USDT",
    side: "sell",
    pnl: 2.1,
    strategy: "DCA Trygg",
    time: new Date(Date.now() - 1000 * 60 * 15),
    countryCode: "FI",
  },
];

const COUNTRY_FLAGS: Record<string, string> = {
  NO: "🇳🇴",
  SE: "🇸🇪",
  DK: "🇩🇰",
  FI: "🇫🇮",
  DE: "🇩🇪",
  US: "🇺🇸",
  UK: "🇬🇧",
};

export function LiveTradeFeed({ limit = 10, showHeader = true }: LiveTradeFeedProps) {
  const [trades, setTrades] = useState<LiveTrade[]>(MOCK_TRADES);
  const [activeTraders, setActiveTraders] = useState(142);
  const locale = useLocale();
  const dateLocale = locale === "no" ? nb : enUS;
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    // Simuler nye trades hvert 15. sekund
    const interval = setInterval(() => {
      const strategies = ["DCA Trygg", "Trend Balansert", "Grid Bot", "Multi-Signal"];
      const symbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];
      const users = [
        { name: "NordicTrader", initials: "NT" },
        { name: "CryptoKing", initials: "CK" },
        { name: "BitcoinBull", initials: "BB" },
        { name: "AltcoinAlice", initials: "AA" },
        { name: "DeFiDave", initials: "DD" },
      ];

      const randomUser = users[Math.floor(Math.random() * users.length)];
      const newTrade: LiveTrade = {
        id: Date.now().toString(),
        userName: randomUser.name,
        userInitials: randomUser.initials,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        side: Math.random() > 0.5 ? "buy" : "sell",
        pnl: Number((Math.random() * 10 - 2).toFixed(1)),
        strategy: strategies[Math.floor(Math.random() * strategies.length)],
        time: new Date(),
        countryCode: ["NO", "SE", "DK"][Math.floor(Math.random() * 3)],
      };

      setTrades((prev) => [newTrade, ...prev].slice(0, limit));
      setActiveTraders((prev) => prev + Math.floor(Math.random() * 3) - 1);
    }, 15000);

    return () => clearInterval(interval);
  }, [limit]);

  const timeAgo = (date: Date) => {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: dateLocale,
    });
  };

  return (
    <motion.div
      className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {showHeader && (
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="text-2xl">🔥</span>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-white">Live handler</h3>
              <p className="text-slate-500 text-xs">Siste aktivitet fra fellesskapet</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-sm text-emerald-400 font-medium">
              {activeTraders} aktive tradere
            </span>
          </div>
        </div>
      )}

      <div className="max-h-[400px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {trades.map((trade, index) => (
            <motion.div
              key={trade.id}
              layout
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="p-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                {/* Avatar med gradient */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br ${
                    trade.pnl > 0
                      ? "from-emerald-500 to-teal-600"
                      : "from-red-500 to-orange-600"
                  }`}
                >
                  {trade.userInitials}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium truncate">
                      {trade.userName}
                    </span>
                    <span className="text-base" title={trade.countryCode}>
                      {COUNTRY_FLAGS[trade.countryCode || "NO"]}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span
                      className={`font-medium ${
                        trade.side === "buy" ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {trade.side === "buy" ? "Kjøpte" : "Solgte"}
                    </span>
                    <span className="text-slate-400">{trade.symbol}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-500">{trade.strategy}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`px-2.5 py-1 rounded-lg text-sm font-bold ${
                      trade.pnl > 0
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {trade.pnl > 0 ? "+" : ""}
                    {trade.pnl}%
                  </div>
                  <p className="text-slate-600 text-[10px] mt-1">{timeAgo(trade.time)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer med CTA */}
      <div className="p-4 bg-slate-800/30 border-t border-slate-700">
        <button className="w-full py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors">
          Se alle handler →
        </button>
      </div>
    </motion.div>
  );
}

export default LiveTradeFeed;
