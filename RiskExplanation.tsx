"use client";

import { useMemo } from "react";
import { Shield, Scale, Zap, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

export type RiskLevel = "safe" | "balanced" | "aggressive";

interface RiskExplanationProps {
  level: RiskLevel;
  locale?: "no" | "en";
  userBalance?: number;
  className?: string;
}

interface RiskExplanationData {
  headline: string;
  headlineEn: string;
  icon: typeof Shield;
  color: string;
  practicalExample: string;
  practicalExampleEn: string;
  autoSellExplanation: string;
  autoSellExplanationEn: string;
  maxOpenPositions: string;
  maxOpenPositionsEn: string;
  moreLikely: string[];
  moreLikelyEn: string[];
  lessLikely: string[];
  lessLikelyEn: string[];
  systemBlocks: string[];
  systemBlocksEn: string[];
  copyForSavers: {
    headline: string;
    headlineEn: string;
    body: string;
    bodyEn: string;
  };
}

const RISK_EXPLANATIONS: Record<RiskLevel, RiskExplanationData> = {
  safe: {
    headline: "Trygg",
    headlineEn: "Safe",
    icon: Shield,
    color: "#10b981",
    practicalExample: "Med 100 000 kr i lekepenger kan du handle for inntil 2 000 kr per trade",
    practicalExampleEn: "With 100,000 kr play money, you can trade up to 2,000 kr per trade",
    autoSellExplanation: "Hvis en handel taper 600 kr (3%), selger roboten automatisk for å beskytte deg",
    autoSellExplanationEn: "If a trade loses 600 kr (3%), the bot automatically sells to protect you",
    maxOpenPositions: "Du kan ha maksimalt 5 000 kr i åpne handler samtidig",
    maxOpenPositionsEn: "You can have maximum 5,000 kr in open trades at the same time",
    moreLikely: [
      "Små, jevne gevinster (+200–500 kr per uke)",
      "Du sover godt uten å sjekke prisen hele tiden",
      "Du lærer markedet å kjenne uten stress"
    ],
    moreLikelyEn: [
      "Small, steady gains (+200-500 kr per week)",
      "You sleep well without checking price constantly",
      "You learn the market without stress"
    ],
    lessLikely: [
      "Å doble kontoen på én måned",
      "Spennende daglige svingninger",
      "Følelsen av å være «i markedet»"
    ],
    lessLikelyEn: [
      "Doubling account in one month",
      "Exciting daily swings",
      "Feeling of being «in the market»"
    ],
    systemBlocks: [
      "Handler over 2 000 kr per trade",
      "Nye handler hvis du har tapt mer enn 1 000 kr i dag",
      "Handler hvis total eksponering overstiger 5 000 kr"
    ],
    systemBlocksEn: [
      "Trades over 2,000 kr per trade",
      "New trades if you've lost more than 1,000 kr today",
      "Trades if total exposure exceeds 5,000 kr"
    ],
    copyForSavers: {
      headline: "Perfekt for deg som vil lære uten å risikere",
      headlineEn: "Perfect for learning without risking",
      body: "Her får du kjenne på hvordan det er å handle krypto, men roboten passer på at du ikke taper for mye. Perfekt for første gang.",
      bodyEn: "Here you get to feel what it's like to trade crypto, but the bot ensures you don't lose too much. Perfect for first time."
    }
  },
  balanced: {
    headline: "Balansert",
    headlineEn: "Balanced",
    icon: Scale,
    color: "#f59e0b",
    practicalExample: "Med 100 000 kr i lekepenger kan du handle for inntil 5 000 kr per trade",
    practicalExampleEn: "With 100,000 kr play money, you can trade up to 5,000 kr per trade",
    autoSellExplanation: "Hvis en handel taper 350 kr (7%), selger roboten automatisk",
    autoSellExplanationEn: "If a trade loses 350 kr (7%), the bot automatically sells",
    maxOpenPositions: "Du kan ha maksimalt 15 000 kr i åpne handler samtidig",
    maxOpenPositionsEn: "You can have maximum 15,000 kr in open trades at the same time",
    moreLikely: [
      "Varierte uker – noen med pluss, noen med minus",
      "Du merker at kontoen beveger seg mer",
      "Lærer å håndtere både gevinster og tap"
    ],
    moreLikelyEn: [
      "Varied weeks – some with gains, some with losses",
      "You notice the account moves more",
      "Learn to handle both profits and losses"
    ],
    lessLikely: [
      "Å miste halve kontoen på én dag",
      "Å tjene 10 000 kr på én uke uten flaks",
      "Kjedelige, flate perioder"
    ],
    lessLikelyEn: [
      "Losing half the account in one day",
      "Earning 10,000 kr in one week without luck",
      "Boring, flat periods"
    ],
    systemBlocks: [
      "Handler over 5 000 kr per trade",
      "Nye handler hvis du har tapt mer enn 3 000 kr i dag",
      "Handler hvis total eksponering overstiger 15 000 kr"
    ],
    systemBlocksEn: [
      "Trades over 5,000 kr per trade",
      "New trades if you've lost more than 3,000 kr today",
      "Trades if total exposure exceeds 15,000 kr"
    ],
    copyForSavers: {
      headline: "For deg som har handlet litt før",
      headlineEn: "For those who have traded a bit before",
      body: "Du tåler å se kontoen gå litt ned noen dager, fordi du vet den pleier å komme seg. Mer spennende, men fortsatt trygt.",
      bodyEn: "You tolerate seeing the account go down some days, because you know it usually recovers. More exciting, but still safe."
    }
  },
  aggressive: {
    headline: "Aggressiv",
    headlineEn: "Aggressive",
    icon: Zap,
    color: "#ef4444",
    practicalExample: "Med 100 000 kr i lekepenger kan du handle for inntil 10 000 kr per trade",
    practicalExampleEn: "With 100,000 kr play money, you can trade up to 10,000 kr per trade",
    autoSellExplanation: "Roboten selger først når tapet når 1 500 kr (15%)",
    autoSellExplanationEn: "Bot only sells when loss reaches 1,500 kr (15%)",
    maxOpenPositions: "Du kan ha maksimalt 30 000 kr i åpne handler samtidig",
    maxOpenPositionsEn: "You can have maximum 30,000 kr in open trades at the same time",
    moreLikely: [
      "Spennende, aktive handelsdager",
      "Større svingninger (+/- 3 000–8 000 kr per uke)",
      "Læring om hvordan det føles med reell risiko"
    ],
    moreLikelyEn: [
      "Exciting, active trading days",
      "Larger swings (+/- 3,000-8,000 kr per week)",
      "Learning what real risk feels like"
    ],
    lessLikely: [
      "Jevn, forutsigbar vekst",
      "Å unngå alle store tap",
      "Å sove godt hvis markedet krasjer om natten"
    ],
    lessLikelyEn: [
      "Steady, predictable growth",
      "Avoiding all large losses",
      "Sleeping well if market crashes at night"
    ],
    systemBlocks: [
      "Handler over 10 000 kr per trade",
      "Nye handler hvis du har tapt mer enn 5 000 kr i dag",
      "Handler hvis total eksponering overstiger 30 000 kr"
    ],
    systemBlocksEn: [
      "Trades over 10,000 kr per trade",
      "New trades if you've lost more than 5,000 kr today",
      "Trades if total exposure exceeds 30,000 kr"
    ],
    copyForSavers: {
      headline: "For deg som tåler å se store svingninger",
      headlineEn: "For those who tolerate seeing large swings",
      body: "Du vet at store gevinster krever større risiko. Du håndterer stresset når kontoen faller 20% på én dag, fordi du ser det lange bildet.",
      bodyEn: "You know that big gains require bigger risk. You handle the stress when account drops 20% in one day, because you see the long picture."
    }
  }
};

export function RiskExplanation({ 
  level, 
  locale = "no", 
  userBalance = 100000,
  className = ""
}: RiskExplanationProps) {
  const data = RISK_EXPLANATIONS[level];
  const Icon = data.icon;
  
  const isNorwegian = locale === "no";
  
  // Calculate actual amounts based on user balance
  const maxPositionPct = level === "safe" ? 2 : level === "balanced" ? 5 : 10;
  const maxPositionAmount = Math.floor(userBalance * maxPositionPct / 100);
  const stopLossPct = level === "safe" ? 3 : level === "balanced" ? 7 : 15;
  const stopLossAmount = Math.floor(maxPositionAmount * stopLossPct / 100);
  const maxExposurePct = level === "safe" ? 5 : level === "balanced" ? 15 : 30;
  const maxExposureAmount = Math.floor(userBalance * maxExposurePct / 100);
  const dailyLossPct = level === "safe" ? 1 : level === "balanced" ? 3 : 5;
  const dailyLossAmount = Math.floor(userBalance * dailyLossPct / 100);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(locale === "no" ? "nb-NO" : "en-US");
  };

  return (
    <div className={`bg-slate-900/50 border border-slate-700 rounded-xl p-5 space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-700">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${data.color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color: data.color }} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">
            {isNorwegian ? data.headline : data.headlineEn}
          </h3>
          <p className="text-sm text-slate-400">
            {isNorwegian ? "Slik fungerer dette nivået" : "How this level works"}
          </p>
        </div>
      </div>

      {/* What this means */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-300">
          {isNorwegian ? "Hva dette betyr" : "What this means"}
        </h4>
        
        <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
              <span className="text-blue-400 text-sm font-bold">kr</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {isNorwegian 
                ? `Med ${formatCurrency(userBalance)} kr kan du handle for inntil ${formatCurrency(maxPositionAmount)} kr per trade (${maxPositionPct}% av saldoen)`
                : `With ${formatCurrency(userBalance)} kr you can trade up to ${formatCurrency(maxPositionAmount)} kr per trade (${maxPositionPct}% of balance)`
              }
            </p>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {isNorwegian 
                ? `Hvis en handel taper ${formatCurrency(stopLossAmount)} kr (${stopLossPct}%), selger roboten automatisk for å beskytte deg`
                : `If a trade loses ${formatCurrency(stopLossAmount)} kr (${stopLossPct}%), the bot automatically sells to protect you`
              }
            </p>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
              <span className="text-purple-400 text-xs font-bold">MAX</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {isNorwegian 
                ? `Du kan ha maksimalt ${formatCurrency(maxExposureAmount)} kr i åpne handler samtidig (${maxExposurePct}% av saldoen)`
                : `You can have maximum ${formatCurrency(maxExposureAmount)} kr in open trades at once (${maxExposurePct}% of balance)`
              }
            </p>
          </div>
        </div>
      </div>

      {/* More likely */}
      <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-emerald-400 mb-3 uppercase tracking-wide flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isNorwegian ? "Mer sannsynlig" : "More likely"}
        </h4>
        <ul className="space-y-2">
          {(isNorwegian ? data.moreLikely : data.moreLikelyEn).map((item, i) => (
            <li key={i} className="text-sm text-emerald-300 flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Less likely */}
      <div className="bg-slate-800/30 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide flex items-center gap-2">
          <XCircle className="w-3.5 h-3.5" />
          {isNorwegian ? "Mindre sannsynlig" : "Less likely"}
        </h4>
        <ul className="space-y-2">
          {(isNorwegian ? data.lessLikely : data.lessLikelyEn).map((item, i) => (
            <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
              <span className="text-slate-500 mt-0.5">×</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* System blocks */}
      <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-red-400 mb-3 uppercase tracking-wide flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          {isNorwegian ? "Systemet blokkerer" : "System blocks"}
        </h4>
        <ul className="space-y-2">
          {(isNorwegian ? data.systemBlocks : data.systemBlocksEn).map((item, i) => {
            // Replace amounts with calculated values
            const formattedItem = item
              .replace(/\d{1,3}(?:\s?\d{3})*(?=\s*kr)/g, (match) => {
                const num = parseInt(match.replace(/\s/g, ""));
                if (num === 2000 || num === 5000 || num === 10000) {
                  return formatCurrency(maxPositionAmount);
                }
                if (num === 1000 || num === 3000 || num === 5000) {
                  return formatCurrency(dailyLossAmount);
                }
                if (num === 5000 || num === 15000 || num === 30000) {
                  return formatCurrency(maxExposureAmount);
                }
                return match;
              });
            
            return (
              <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                <span className="text-red-500 mt-0.5">🚫</span>
                {formattedItem}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Paper trading reminder */}
      <div className="bg-blue-950/30 border border-blue-800/30 rounded-lg p-4 flex items-start gap-3">
        <span className="text-2xl">🎮</span>
        <div>
          <p className="text-sm font-medium text-blue-300">
            {isNorwegian 
              ? data.copyForSavers.headline 
              : data.copyForSavers.headlineEn}
          </p>
          <p className="text-xs text-blue-400 mt-1 leading-relaxed">
            {isNorwegian 
              ? data.copyForSavers.body 
              : data.copyForSavers.bodyEn}
          </p>
          <p className="text-xs text-blue-500 mt-2">
            {isNorwegian 
              ? "Ingen reell risiko – bytt til ekte penger når du er klar"
              : "No real risk – switch to real money when ready"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default RiskExplanation;
