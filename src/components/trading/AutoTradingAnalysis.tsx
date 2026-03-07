"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Bot, TrendingUp, Shield, Zap, AlertTriangle, 
  CheckCircle, Info, ChevronDown, ChevronUp 
} from "lucide-react";

interface RiskProfile {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  stats: {
    winRate: number;
    avgReturn: number;
    maxDrawdown: number;
    tradesPerMonth: number;
  };
  settings: {
    positionSize: string;
    stopLoss: string;
    takeProfit: string;
    leverage: string;
  };
  pros: string[];
  cons: string[];
  recommendedFor: string[];
}

const RISK_PROFILES: RiskProfile[] = [
  {
    id: "conservative",
    name: "Konservativ",
    nameEn: "Conservative",
    description: "Lav risiko, jevn vekst. Ideell for deg som vil sove godt om natten.",
    icon: <Shield className="w-6 h-6" />,
    color: "#10B981",
    stats: {
      winRate: 68,
      avgReturn: 12,
      maxDrawdown: 8,
      tradesPerMonth: 15,
    },
    settings: {
      positionSize: "2-3% av kapital",
      stopLoss: "Stramm (2-3%)",
      takeProfit: "1:1.5 risiko/avkastning",
      leverage: "1x (ingen)",
    },
    pros: [
      "Høy win-rate (68%)",
      "Lav drawdown",
      "Jevn avkastning",
      "Passer for nybegynnere",
    ],
    cons: [
      "Lavere total avkastning",
      "Færre trading-muligheter",
      "Kan gå glipp av store trender",
    ],
    recommendedFor: [
      "Nye tradere",
      "Risikosky personer",
      "Langsiktige investorer",
      "De med lav risikotoleranse",
    ],
  },
  {
    id: "balanced",
    name: "Balansert",
    nameEn: "Balanced",
    description: "Moderat risiko og avkastning. Den gyldne middelvei for de fleste.",
    icon: <Zap className="w-6 h-6" />,
    color: "#3B82F6",
    stats: {
      winRate: 58,
      avgReturn: 28,
      maxDrawdown: 18,
      tradesPerMonth: 25,
    },
    settings: {
      positionSize: "3-5% av kapital",
      stopLoss: "Moderat (4-5%)",
      takeProfit: "1:2 risiko/avkastning",
      leverage: "2-3x",
    },
    pros: [
      "God balanse risiko/avkastning",
      "Fleksibel strategi",
      "Tilpasser seg markedet",
      "Passer for de fleste",
    ],
    cons: [
      "Høyere drawdown enn konservativ",
      "Krever mer aktiv overvåking",
      "Større svingninger i P&L",
    ],
    recommendedFor: [
      "Erfarne tradere",
      "Moderat risiko-appetitt",
      "Aktive investorer",
      "De med 6+ måneder erfaring",
    ],
  },
  {
    id: "aggressive",
    name: "Agressiv",
    nameEn: "Aggressive",
    description: "Høy risiko, høy potensiell avkastning. For erfarne tradere.",
    icon: <TrendingUp className="w-6 h-6" />,
    color: "#F59E0B",
    stats: {
      winRate: 45,
      avgReturn: 55,
      maxDrawdown: 35,
      tradesPerMonth: 40,
    },
    settings: {
      positionSize: "5-8% av kapital",
      stopLoss: "Vid (7-10%)",
      takeProfit: "1:3+ risiko/avkastning",
      leverage: "3-5x",
    },
    pros: [
      "Høyeste potensielle avkastning",
      "Maksimerer trender",
      "Aktiv trading-opplevelse",
      "Store gevinster mulig",
    ],
    cons: [
      "Høy drawdown risiko",
      "Lavere win-rate",
      "Krever stor erfaring",
      "Psykisk krevende",
    ],
    recommendedFor: [
      "Eksperter",
      "Høy risiko-toleranse",
      "Fulltid tradere",
      "De med 2+ år erfaring",
    ],
  },
];

export function AutoTradingAnalysis() {
  const [selectedProfile, setSelectedProfile] = useState<RiskProfile>(RISK_PROFILES[1]);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-xl">Auto-Trading Analyse</h2>
            <p className="text-slate-400 text-sm">Velg risikoprofil basert på dine mål</p>
          </div>
        </div>

        {/* Profile Selector */}
        <div className="grid grid-cols-3 gap-3">
          {RISK_PROFILES.map((profile) => (
            <button
              key={profile.id}
              onClick={() => setSelectedProfile(profile)}
              className={`p-4 rounded-xl border transition-all text-left ${
                selectedProfile.id === profile.id
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: `${profile.color}20`, color: profile.color }}
              >
                {profile.icon}
              </div>
              <h3 className="text-white font-semibold text-sm">{profile.name}</h3>
              <p className="text-slate-500 text-xs mt-1">+{profile.stats.avgReturn}%/år</p>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Profile Details */}
      <motion.div
        key={selectedProfile.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-white/10"
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-white font-bold text-xl">{selectedProfile.name}</h3>
            <p className="text-slate-400 mt-1">{selectedProfile.description}</p>
          </div>
          <div 
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{ backgroundColor: `${selectedProfile.color}20`, color: selectedProfile.color }}
          >
            {selectedProfile.stats.winRate}% Win Rate
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{selectedProfile.stats.winRate}%</div>
            <div className="text-xs text-slate-500">Win Rate</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: selectedProfile.color }}>
              +{selectedProfile.stats.avgReturn}%
            </div>
            <div className="text-xs text-slate-500">Årlig snitt</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-400">
              -{selectedProfile.stats.maxDrawdown}%
            </div>
            <div className="text-xs text-slate-500">Max Drawdown</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{selectedProfile.stats.tradesPerMonth}</div>
            <div className="text-xs text-slate-500">Trades/mnd</div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white/5 rounded-xl p-4 mb-4">
          <h4 className="text-white font-semibold mb-3">Strategi-innstillinger</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500">Posisjonsstørrelse</div>
              <div className="text-white font-medium">{selectedProfile.settings.positionSize}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Stop Loss</div>
              <div className="text-white font-medium">{selectedProfile.settings.stopLoss}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Take Profit</div>
              <div className="text-white font-medium">{selectedProfile.settings.takeProfit}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Leverage</div>
              <div className="text-white font-medium">{selectedProfile.settings.leverage}</div>
            </div>
          </div>
        </div>

        {/* Expandable Details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
        >
          <span className="text-white font-medium">Detaljert analyse</span>
          {showDetails ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="mt-4 space-y-4"
          >
            {/* Pros */}
            <div>
              <h4 className="text-green-400 font-semibold flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4" /> Fordeler
              </h4>
              <ul className="space-y-1">
                {selectedProfile.pros.map((pro, i) => (
                  <li key={i} className="text-slate-400 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            <div>
              <h4 className="text-amber-400 font-semibold flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" /> Ulemper
              </h4>
              <ul className="space-y-1">
                {selectedProfile.cons.map((con, i) => (
                  <li key={i} className="text-slate-400 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                    {con}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended For */}
            <div>
              <h4 className="text-blue-400 font-semibold flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" /> Anbefalt for
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedProfile.recommendedFor.map((rec, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded">
                    {rec}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-200/80">
          Historisk avkastning er ingen garanti for fremtidige resultater. 
          Auto-trading innebærer risiko, og du kan tape hele investeringen din. 
          Start alltid med paper trading.
        </p>
      </div>
    </div>
  );
}
