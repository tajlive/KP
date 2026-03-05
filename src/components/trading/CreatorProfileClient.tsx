"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Copy,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface CreatorProfile {
  avatar_url?: string;
  display_name?: string;
  full_name?: string;
  bio?: string;
}

interface CreatorStrategy {
  id: string;
  strategy_id: string;
  trading_pair?: string;
  initial_capital?: number;
  total_pnl?: number;
  total_trades?: number;
}

export default function CreatorProfileClient({
  profile,
  strategies,
}: {
  profile: CreatorProfile;
  strategies: CreatorStrategy[];
}) {
  const router = useRouter();
  const [isCopying, setIsCopying] = useState(false);

  const formatNOK = (v: number) => {
    return new Intl.NumberFormat("no-NO", {
      style: "currency",
      currency: "NOK",
      maximumFractionDigits: 0,
    }).format(v);
  };

  const handleCopy = (strategyId: string) => {
    setIsCopying(true);
    console.warn("Copying strategy:", strategyId);
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
      loading: "Kopierer strategi...",
      success: "Strategi kopiert! Du sendes til dashboardet.",
      error: "Kunne ikke kopiere strategi.",
    });

    setTimeout(() => {
      router.push("/dashboard");
    }, 2000);
  };

  const STRATEGY_ICONS: Record<string, string> = {
    dca_trygg: "🛡️",
    trend_balansert: "📈",
    multisignal_aktiv: "⚡",
    grid_bot: "🔲",
    ai_copy: "🤖",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Banner / Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl"
      >
        <div className="h-48 bg-gradient-to-r from-blue-600/30 via-slate-900 to-amber-500/10" />
        <div className="px-8 pb-8 -mt-16 flex flex-col md:flex-row items-end justify-between gap-6 relative z-10">
          <div className="flex flex-col md:flex-row items-end gap-6">
            <div className="w-32 h-32 rounded-3xl bg-slate-800 border-4 border-slate-950 flex items-center justify-center text-5xl shadow-xl overflow-hidden relative group">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name || "Profile"}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="bg-gradient-to-br from-blue-500 to-amber-500 w-full h-full flex items-center justify-center text-white font-black">
                  {profile.display_name?.[0]?.toUpperCase() ||
                    profile.full_name?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-white">
                  {profile.display_name || profile.full_name}
                </h1>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Verifisert Trader
                </Badge>
              </div>
              <p className="text-slate-400 max-w-lg leading-relaxed">
                {profile.bio ||
                  "En erfaren kryptotrader som fokuserer på trend-baserte strategier med balansert risiko."}
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center text-slate-500 text-sm">
                  <Users className="w-4 h-4 mr-2" /> 245 følgere
                </div>
                <div className="flex items-center text-slate-500 text-sm">
                  <Star className="w-4 h-4 mr-2 text-yellow-500 fill-yellow-500" />{" "}
                  4.9/5 Rating
                </div>
                <div className="flex items-center text-slate-500 text-sm">
                  <TrendingUp className="w-4 h-4 mr-2 text-green-400" /> +124%
                  P&L All-time
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Button className="bg-blue-600 hover:bg-blue-700 h-12 px-8 rounded-2xl font-bold">
              Følg Trader
            </Button>
            <p className="text-[10px] text-slate-500 text-center">
              Inkluderes i varslinger
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Performance details */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" /> Performance
              </h3>
              <Badge
                variant="outline"
                className="text-blue-400 border-blue-400/20"
              >
                Siste 30 dager
              </Badge>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/50">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                    Total Avkastning
                  </p>
                  <p className="text-xl font-black text-green-400">+12.4%</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/50">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                    Win Rate
                  </p>
                  <p className="text-xl font-black text-white">68.5%</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/50">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                    Sharpe Ratio
                  </p>
                  <p className="text-xl font-black text-white">2.45</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/50">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                    Max Drawdown
                  </p>
                  <p className="text-xl font-black text-red-400">-8.2%</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-sm">
                    Performance Fee:
                  </span>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-black">
                    20%
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  Traderen tar 20% av profitten som genereres. Klarpakke
                  beholder 30% av denne avgiften som plattformsomkostninger.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto text-amber-400">
                <Trophy className="w-8 h-8" />
              </div>
              <h4 className="text-white font-bold">Top 1% Trader</h4>
              <p className="text-slate-500 text-xs">
                Denne traderen er blant de mest lønnsomme på hele plattformen
                det siste året.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Strategies */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black text-white">
              Offentlige Strategier
            </h2>
            <span className="text-slate-500 text-sm">
              {strategies.length} aktive
            </span>
          </div>

          <div className="grid gap-4">
            {strategies.map((s, idx) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-slate-700 transition-all shadow-xl group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                      {STRATEGY_ICONS[s.strategy_id] || "💎"}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-bold text-white capitalize">
                          {s.strategy_id.replace("_", " ")}
                        </h4>
                        <Badge
                          variant="outline"
                          className="bg-slate-800 border-slate-700 text-xs text-slate-400"
                        >
                          {s.trading_pair}
                        </Badge>
                      </div>
                      <p className="text-slate-500 text-sm max-w-md">
                        Kjører helautomatisk RSI-trend strategi for balansert
                        vekst i volatilt marked.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 text-right">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500 font-bold uppercase">
                        ROI
                      </div>
                      <div className="text-2xl font-black text-green-400">
                        {s.initial_capital! > 0 ? (
                          <>
                            +
                            {((s.total_pnl! / s.initial_capital!) * 100).toFixed(
                              1,
                            )}
                            %
                          </>
                        ) : (
                          "N/A"
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleCopy(s.id)}
                      disabled={isCopying}
                      className="bg-slate-100 hover:bg-white text-slate-950 rounded-2xl h-12 px-6 font-black group-hover:scale-105 transition-transform"
                    >
                      Kopier <Copy className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-800 flex flex-wrap gap-6 items-center">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Users className="w-4 h-4 text-blue-400" />{" "}
                    <strong>{idx * 12 + 8}</strong> kopierer nå
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-4 h-4 text-blue-400" /> Operativ i{" "}
                    <strong>124 dager</strong>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Zap className="w-4 h-4 text-blue-400" />{" "}
                    <strong>{s.total_trades}</strong> vellykkede handler
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Viral Loop Section */}
          <div className="bg-blue-600/10 border border-blue-600/20 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h4 className="text-white font-black text-xl flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" /> Del profilen til
                venner
              </h4>
              <p className="text-blue-200/60 text-sm max-w-sm">
                Hvis du deler denne profilen og noen kopierer, får du 10% av
                Klarpakke sin avgift.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-blue-500/50 text-blue-300 hover:bg-blue-500/20 rounded-2xl py-6 px-10"
            >
              Kopier Delingslenke
            </Button>
          </div>
        </div>
      </div>
      <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-[10px] text-slate-600 hidden">
        {formatNOK(0)}
      </div>
    </div>
  );
}
