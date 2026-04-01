import {
  Activity,
  BarChart3,
  Rocket,
  Sparkles,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { MockTrade, Step, Strategy } from "./types";

export const STEPS: Step[] = [
  { id: 1, title: "Velg strategi", icon: Rocket },
  { id: 2, title: "Vent 3 dager", icon: Timer },
  { id: 3, title: "Forstå gevinst", icon: Target },
  { id: 4, title: "Forstå tap", icon: TrendingDown },
  { id: 5, title: "Sammenlign", icon: Trophy },
];

export const STRATEGIES: Strategy[] = [
  {
    id: "trend",
    name: "Trend Trading",
    description: "Følger markedets retning",
    icon: TrendingUp,
    color: "from-blue-500 to-cyan-500",
    risk: "Middels",
  },
  {
    id: "dca",
    name: "DCA Strategy",
    description: "Jevne kjøp over tid",
    icon: Activity,
    color: "from-emerald-500 to-green-500",
    risk: "Lav",
  },
  {
    id: "grid",
    name: "Grid Trading",
    description: "Handler i et prisområde",
    icon: BarChart3,
    color: "from-emerald-500 to-pink-500",
    risk: "Middels",
  },
  {
    id: "breakout",
    name: "Breakout",
    description: "Utbrudd fra nivåer",
    icon: Sparkles,
    color: "from-amber-500 to-orange-500",
    risk: "Høy",
  },
  {
    id: "ai",
    name: "AI Optimized",
    description: "AI-tilpasset strategi",
    icon: Zap,
    color: "from-rose-500 to-red-500",
    risk: "Middels",
  },
];

export const MOCK_WIN_TRADE: MockTrade = {
  id: "win-1",
  pair: "BTC/USDT",
  side: "BUY",
  amount: 25000,
  pnlPercent: 5.2,
  strategy: "Trend Trading",
  aiExplanation:
    "Strategien identifiserte en sterk bullish trend ved $42,000-nivået. Volumøkning bekreftet utbruddet.",
  timestamp: new Date(),
};

export const MOCK_LOSS_TRADE: MockTrade = {
  id: "loss-1",
  pair: "ETH/USDT",
  side: "BUY",
  amount: 15000,
  pnlPercent: -2.8,
  strategy: "DCA Strategy",
  aiExplanation:
    "Markedet opplevde en uventet likviditets-squeeze. Ved å tape kun 2.8% beskytter vi kapitalen.",
  timestamp: new Date(),
};

export const MOCK_LEADERBOARD = [
  { rank: 1, name: "CryptoKing", pnl: "+45.2%", trades: 24, winRate: 78 },
  { rank: 2, name: "DiamondHands", pnl: "+31.8%", trades: 12, winRate: 85 },
  { rank: 3, name: "MoonShot", pnl: "+18.5%", trades: 8, winRate: 62 },
  { rank: 7, name: "Du", pnl: "+5.2%", trades: 1, winRate: 100, isUser: true },
  { rank: 12, name: "TradeMaster", pnl: "+2.1%", trades: 15, winRate: 53 },
];
