"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Wallet, TrendingUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface TradeAmountSliderProps {
  userBalance: number;
  maxPositionPct: number;
  maxPositionAmount: number;
  currentExposure: number;
  locale?: "no" | "en";
  onAmountSelect?: (amount: number) => void;
  selectedAmount?: number;
}

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

export function TradeAmountSlider({
  userBalance,
  maxPositionPct,
  maxPositionAmount,
  currentExposure,
  locale = "no",
  onAmountSelect,
  selectedAmount,
}: TradeAmountSliderProps) {
  const isNorwegian = locale === "no";
  const [amount, setAmount] = useState(selectedAmount || Math.min(2000, maxPositionAmount));
  
  const remainingExposure = maxPositionAmount * (maxPositionPct === 2 ? 2.5 : maxPositionPct === 5 ? 3 : 3) - currentExposure;
  
  const percentageOfBalance = (amount / userBalance) * 100;
  const percentageOfMax = (amount / maxPositionAmount) * 100;
  
  const status = useMemo(() => {
    if (amount > maxPositionAmount) return "blocked";
    if (amount > remainingExposure) return "warning";
    if (percentageOfBalance > maxPositionPct * 1.5) return "caution";
    return "ok";
  }, [amount, maxPositionAmount, remainingExposure, percentageOfBalance, maxPositionPct]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString(isNorwegian ? "nb-NO" : "en-US");
  };

  const handlePresetClick = (preset: number) => {
    const newAmount = Math.min(preset, userBalance);
    setAmount(newAmount);
    onAmountSelect?.(newAmount);
  };

  const handleSliderChange = (value: number[]) => {
    const newAmount = value[0];
    setAmount(newAmount);
    onAmountSelect?.(newAmount);
  };

  const getStatusColor = () => {
    switch (status) {
      case "blocked": return "text-red-400";
      case "warning": return "text-amber-400";
      case "caution": return "text-yellow-400";
      default: return "text-emerald-400";
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case "blocked": return "bg-red-500/10 border-red-500/30";
      case "warning": return "bg-amber-500/10 border-amber-500/30";
      case "caution": return "bg-yellow-500/10 border-yellow-500/30";
      default: return "bg-emerald-500/10 border-emerald-500/30";
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header with explanation */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-400">
              {isNorwegian ? "Din saldo" : "Your balance"}
            </span>
          </div>
          <span className="text-lg font-bold text-white">
            {formatCurrency(userBalance)} kr
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-slate-400">
              {isNorwegian ? "Maks per trade" : "Max per trade"}
            </span>
          </div>
          <span className="font-medium text-blue-400">
            {formatCurrency(maxPositionAmount)} kr ({maxPositionPct}%)
          </span>
        </div>
        
        {currentExposure > 0 && (
          <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-slate-700">
            <span className="text-slate-400">
              {isNorwegian ? "Allerede i markedet" : "Already in market"}
            </span>
            <span className="font-medium text-amber-400">
              {formatCurrency(currentExposure)} kr
            </span>
          </div>
        )}
      </div>

      {/* Slider */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">
            {isNorwegian ? "Hvor mye vil du handle for?" : "How much do you want to trade?"}
          </label>
          <span className={`text-2xl font-bold ${getStatusColor()}`}>
            {formatCurrency(amount)} kr
          </span>
        </div>

        <Slider
          value={[amount]}
          onValueChange={handleSliderChange}
          max={Math.min(userBalance, maxPositionAmount * 1.5)}
          step={100}
          className="w-full"
        />

        {/* Status message */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg p-3 border ${getStatusBg()}`}
        >
          <div className="flex items-start gap-2">
            <AlertCircle className={`w-4 h-4 mt-0.5 ${getStatusColor()}`} />
            <div className="text-sm">
              {status === "blocked" && (
                <>
                  <span className={getStatusColor()}>
                    {isNorwegian 
                      ? `Overstiger maksgrensen på ${formatCurrency(maxPositionAmount)} kr`
                      : `Exceeds maximum limit of ${formatCurrency(maxPositionAmount)} kr`
                    }
                  </span>
                  <p className="text-slate-400 mt-1 text-xs">
                    {isNorwegian 
                      ? "Systemet vil blokkere denne handelen. Velg et lavere beløp."
                      : "System will block this trade. Choose a lower amount."
                    }
                  </p>
                </>
              )}
              {status === "warning" && (
                <>
                  <span className={getStatusColor()}>
                    {isNorwegian 
                      ? `Nærmer seg total eksponeringsgrense`
                      : `Approaching total exposure limit`
                    }
                  </span>
                  <p className="text-slate-400 mt-1 text-xs">
                    {isNorwegian 
                      ? `Du har ${formatCurrency(remainingExposure)} kr igjen til din maksimale eksponering.`
                      : `You have ${formatCurrency(remainingExposure)} kr left for your maximum exposure.`
                    }
                  </p>
                </>
              )}
              {status === "caution" && (
                <>
                  <span className={getStatusColor()}>
                    {isNorwegian 
                      ? `Stor andel av saldoen (${percentageOfBalance.toFixed(1)}%)`
                      : `Large portion of balance (${percentageOfBalance.toFixed(1)}%)`
                    }
                  </span>
                  <p className="text-slate-400 mt-1 text-xs">
                    {isNorwegian 
                      ? "Vurder å dele opp i flere mindre handler."
                      : "Consider splitting into multiple smaller trades."
                    }
                  </p>
                </>
              )}
              {status === "ok" && (
                <>
                  <span className={getStatusColor()}>
                    {isNorwegian 
                      ? `Innenfor trygge rammer (${percentageOfBalance.toFixed(1)}% av saldoen)`
                      : `Within safe limits (${percentageOfBalance.toFixed(1)}% of balance)`
                    }
                  </span>
                  <p className="text-slate-400 mt-1 text-xs">
                    {isNorwegian 
                      ? "Dette er et fornuftig beløp for ditt risikonivå."
                      : "This is a reasonable amount for your risk level."
                    }
                  </p>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Explanation of what happens */}
        <div className="bg-slate-800/30 rounded-lg p-3 space-y-2">
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            {isNorwegian ? "Dette betyr" : "This means"}
          </h4>
          <ul className="space-y-1.5 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              {isNorwegian 
                ? `Hvis markedet stiger 10%, tjener du ca ${formatCurrency(amount * 0.1)} kr`
                : `If market rises 10%, you earn approx ${formatCurrency(amount * 0.1)} kr`
              }
            </li>
            <li className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              {isNorwegian 
                ? `Hvis markedet faller 10%, taper du ca ${formatCurrency(amount * 0.1)} kr`
                : `If market falls 10%, you lose approx ${formatCurrency(amount * 0.1)} kr`
              }
            </li>
            <li className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              {isNorwegian 
                ? `Roboten selger automatisk hvis tapet overstiger ${formatCurrency(amount * 0.15)} kr (15%)`
                : `Bot auto-sells if loss exceeds ${formatCurrency(amount * 0.15)} kr (15%)`
              }
            </li>
          </ul>
        </div>
      </div>

      {/* Quick select buttons */}
      <div className="grid grid-cols-3 gap-2">
        {PRESET_AMOUNTS.filter(preset => preset <= maxPositionAmount * 1.2).slice(0, 6).map((preset) => (
          <Button
            key={preset}
            variant={amount === preset ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetClick(preset)}
            disabled={preset > maxPositionAmount}
            className={`text-xs ${
              preset > maxPositionAmount 
                ? "opacity-50 cursor-not-allowed" 
                : amount === preset 
                  ? "bg-emerald-600 hover:bg-emerald-700" 
                  : ""
            }`}
          >
            {formatCurrency(preset)} kr
            {preset > maxPositionAmount && (
              <span className="ml-1 text-[10px]">(max)</span>
            )}
          </Button>
        ))}
      </div>

      {/* Paper trading reminder */}
      <div className="bg-blue-950/20 border border-blue-800/30 rounded-lg p-3 flex items-center gap-3">
        <span className="text-xl">🎮</span>
        <div className="text-sm">
          <p className="text-blue-300">
            {isNorwegian 
              ? "Du handler med lekepenger"
              : "You're trading with play money"
            }
          </p>
          <p className="text-blue-400 text-xs">
            {isNorwegian 
              ? "Ingen reell risiko – øv til du føler deg klar for ekte penger"
              : "No real risk – practice until you feel ready for real money"
            }
          </p>
        </div>
      </div>
    </div>
  );
}

export default TradeAmountSlider;
