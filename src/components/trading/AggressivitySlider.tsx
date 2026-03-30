"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Zap, Shield, AlertCircle, Eye, Rabbit } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type AggressivityLevel = "conservative" | "moderate" | "aggressive";

interface AggressivitySliderProps {
  value: AggressivityLevel;
  onChange: (level: AggressivityLevel) => void;
  locale?: "no" | "en";
}

interface AggressivityConfig {
  id: AggressivityLevel;
  label: string;
  labelEn: string;
  icon: typeof Clock;
  color: string;
  description: string;
  descriptionEn: string;
  whatItMeans: string;
  whatItMeansEn: string;
  reactionTime: string;
  reactionTimeEn: string;
  confirmationNeeded: string;
  confirmationNeededEn: string;
  moreLikely: string[];
  moreLikelyEn: string[];
  lessLikely: string[];
  lessLikelyEn: string[];
}

const AGGRESSIVITY_LEVELS: AggressivityConfig[] = [
  {
    id: "conservative",
    label: "Forsiktig",
    labelEn: "Conservative",
    icon: Shield,
    color: "#10b981",
    description: "Venter på tydelige signaler før den handler",
    descriptionEn: "Waits for clear signals before trading",
    whatItMeans: "Roboten er tålmodig og venter på sterke bekreftelser",
    whatItMeansEn: "The bot is patient and waits for strong confirmations",
    reactionTime: "5–15 minutter etter signal oppstår",
    reactionTimeEn: "5–15 minutes after signal appears",
    confirmationNeeded: "2–3 indikatorer må stemme",
    confirmationNeededEn: "2–3 indicators must agree",
    moreLikely: [
      "Å unngå falske signaler",
      "Færre, men mer solide handler",
      "Lavere trading-frekens (2–5 per dag)"
    ],
    moreLikelyEn: [
      "Avoiding false signals",
      "Fewer, but more solid trades",
      "Lower trading frequency (2–5 per day)"
    ],
    lessLikely: [
      "Å fange med et momentum fra start",
      "Å handle på raske nyheter",
      "Høy aktivitet i kontoen"
    ],
    lessLikelyEn: [
      "Catching a momentum from the start",
      "Trading on quick news",
      "High account activity"
    ],
  },
  {
    id: "moderate",
    label: "Balansert",
    labelEn: "Balanced",
    icon: Eye,
    color: "#f59e0b",
    description: "Handler når flere indikatorer peker samme vei",
    descriptionEn: "Trades when multiple indicators point same direction",
    whatItMeans: "Roboten balanserer mellom å vente og å handle raskt",
    whatItMeansEn: "The bot balances between waiting and acting quickly",
    reactionTime: "1–5 minutter etter signal oppstår",
    reactionTimeEn: "1–5 minutes after signal appears",
    confirmationNeeded: "1–2 indikatorer må stemme",
    confirmationNeededEn: "1–2 indicators must agree",
    moreLikely: [
      "Å fange med på trender tidlig",
      "God balanse mellom sikkerhet og hastighet",
      "Moderat aktivitet (5–10 handler per dag)"
    ],
    moreLikelyEn: [
      "Catching trends early",
      "Good balance between safety and speed",
      "Moderate activity (5–10 trades per day)"
    ],
    lessLikely: [
      "Å gå glipp av alle muligheter",
      "Å handle kun på svake signaler",
      "Ekstrem aktivitet eller inaktivitet"
    ],
    lessLikelyEn: [
      "Missing all opportunities",
      "Trading only on weak signals",
      "Extreme activity or inactivity"
    ],
  },
  {
    id: "aggressive",
    label: "Aggressiv",
    labelEn: "Aggressive",
    icon: Rabbit,
    color: "#ef4444",
    description: "Handler raskt på de første signalene",
    descriptionEn: "Acts quickly on first signals",
    whatItMeans: "Roboten reagerer umiddelbart på markedssignalene",
    whatItMeansEn: "The bot reacts immediately to market signals",
    reactionTime: "Umiddelbart (sekunder) etter signal",
    reactionTimeEn: "Immediately (seconds) after signal",
    confirmationNeeded: "Kun 1 indikator trengs",
    confirmationNeededEn: "Only 1 indicator needed",
    moreLikely: [
      "Å fange med på momentum fra start",
      "Høy aktivitet (10–20 handler per dag)",
      "Å reagere raskt på nyheter"
    ],
    moreLikelyEn: [
      "Catching momentum from the start",
      "High activity (10–20 trades per day)",
      "Reacting quickly to news"
    ],
    lessLikely: [
      "Å unngå alle falske signaler",
      "Tålmodig venting på bekreftelse",
      "Langsom, rolig handel"
    ],
    lessLikelyEn: [
      "Avoiding all false signals",
      "Patient waiting for confirmation",
      "Slow, calm trading"
    ],
  },
];

export function AggressivitySlider({
  value,
  onChange,
  locale = "no",
}: AggressivitySliderProps) {
  const [hoveredLevel, setHoveredLevel] = useState<AggressivityLevel | null>(null);
  const isNorwegian = locale === "no";
  
  const currentConfig = AGGRESSIVITY_LEVELS.find((l) => l.id === value)!;
  const currentIndex = AGGRESSIVITY_LEVELS.findIndex((l) => l.id === value);
  const displayLevel = hoveredLevel || value;
  const displayConfig = AGGRESSIVITY_LEVELS.find((l) => l.id === displayLevel)!;
  const Icon = displayConfig.icon;

  const handleSliderChange = (values: number[]) => {
    const index = Math.round(values[0]);
    const level = AGGRESSIVITY_LEVELS[index]?.id;
    if (level) {
      onChange(level);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Slider with labels */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-medium text-slate-300">
            {isNorwegian 
              ? "Hvor raskt skal roboten reagere?"
              : "How fast should the bot react?"}
          </label>
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: `${currentConfig.color}20` }}
          >
            <Icon className="w-4 h-4" style={{ color: currentConfig.color }} />
            <span className="font-semibold text-white">
              {isNorwegian ? currentConfig.label : currentConfig.labelEn}
            </span>
          </div>
        </div>

        <Slider
          value={[currentIndex]}
          onValueChange={handleSliderChange}
          max={2}
          step={1}
          className="w-full mb-6"
        />

        {/* Level indicators */}
        <div className="flex justify-between text-xs text-slate-500 mb-4">
          <span className={cn(value === "conservative" && "text-emerald-400")}>
            {isNorwegian ? "Forsiktig" : "Conservative"}
          </span>
          <span className={cn(value === "moderate" && "text-amber-400")}>
            {isNorwegian ? "Balansert" : "Balanced"}
          </span>
          <span className={cn(value === "aggressive" && "text-red-400")}>
            {isNorwegian ? "Aggressiv" : "Aggressive"}
          </span>
        </div>

        {/* Short description */}
        <p className="text-sm text-slate-400 text-center">
          {isNorwegian ? displayConfig.description : displayConfig.descriptionEn}
        </p>
      </div>

      {/* Detailed explanation */}
      <motion.div
        key={displayLevel}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 space-y-4"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${displayConfig.color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color: displayConfig.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-white">
              {isNorwegian ? displayConfig.whatItMeans : displayConfig.whatItMeansEn}
            </h3>
          </div>
        </div>

        {/* Reaction details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Clock className="w-3.5 h-3.5" />
              {isNorwegian ? "Reaksjonstid" : "Reaction time"}
            </div>
            <p className="text-sm text-white">
              {isNorwegian ? displayConfig.reactionTime : displayConfig.reactionTimeEn}
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Shield className="w-3.5 h-3.5" />
              {isNorwegian ? "Bekreftelse" : "Confirmation"}
            </div>
            <p className="text-sm text-white">
              {isNorwegian ? displayConfig.confirmationNeeded : displayConfig.confirmationNeededEn}
            </p>
          </div>
        </div>

        {/* More likely / Less likely */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wide">
              {isNorwegian ? "Mer sannsynlig" : "More likely"}
            </h4>
            <ul className="space-y-1.5">
              {(isNorwegian ? displayConfig.moreLikely : displayConfig.moreLikelyEn).map((item, i) => (
                <li key={i} className="text-sm text-emerald-300 flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-800/30 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
              {isNorwegian ? "Mindre sannsynlig" : "Less likely"}
            </h4>
            <ul className="space-y-1.5">
              {(isNorwegian ? displayConfig.lessLikely : displayConfig.lessLikelyEn).map((item, i) => (
                <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                  <span className="text-slate-500 mt-0.5">×</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Simple comparison */}
        <div className="bg-slate-800/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <AlertCircle className="w-3.5 h-3.5" />
            {isNorwegian ? "Sammenligning" : "Comparison"}
          </div>
          <p className="text-sm text-slate-300">
            {isNorwegian ? (
              <>
                <strong className="text-emerald-400">Forsiktig</strong> = Sikkerhet først, færre handler. 
                <strong className="text-amber-400"> Balansert</strong> = Godt kompromiss. 
                <strong className="text-red-400"> Aggressiv</strong> = Flere muligheter, mer støy.
              </>
            ) : (
              <>
                <strong className="text-emerald-400">Conservative</strong> = Safety first, fewer trades. 
                <strong className="text-amber-400"> Balanced</strong> = Good compromise. 
                <strong className="text-red-400"> Aggressive</strong> = More opportunities, more noise.
              </>
            )}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default AggressivitySlider;
