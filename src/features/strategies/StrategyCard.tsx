'use client';

import { motion } from 'framer-motion';
import { Check, Shield, TrendingUp, Zap, Scale, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SURFACE } from '@/lib/design/tokens';

export interface Strategy {
  id: string;
  icon: 'shield' | 'scale' | 'rocket';
  title: string;
  subtitle: string;
  description: string;
  expectedReturn: string;
  expectedReturnDetail: string;
  riskLevel: 'low' | 'medium' | 'high';
  protection: string;
  minInvestment: string;
  suitableFor: string[];
  features: string[];
}

interface StrategyCardProps {
  strategy: Strategy;
  isSelected: boolean;
  onSelect: () => void;
}

const riskConfig = {
  low: {
    bg: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/20',
    label: 'Lav risiko',
    icon: Shield,
  },
  medium: {
    bg: 'from-amber-500/20 via-orange-500/10 to-transparent',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/20',
    label: 'Moderat risiko',
    icon: TrendingUp,
  },
  high: {
    bg: 'from-rose-500/20 via-pink-500/10 to-transparent',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    glow: 'shadow-rose-500/20',
    label: 'Høy risiko',
    icon: Zap,
  },
};

const strategyIcons = {
  shield: Shield,
  scale: Scale,
  rocket: Rocket,
};

export function StrategyCard({ strategy, isSelected, onSelect }: StrategyCardProps) {
  const config = riskConfig[strategy.riskLevel];
  if (!config) return null;
  const RiskIcon = config.icon;
  const StrategyIcon = strategyIcons[strategy.icon];

  return (
    <motion.div
      onClick={onSelect}
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-500",
        "rounded-3xl p-6 md:p-8 border-2",
        SURFACE.glass.medium,
        isSelected 
          ? "border-indigo-400 shadow-2xl scale-[1.02]"
          : cn("border-slate-700/50 hover:border-slate-500", config.border)
      )}
      style={{
        boxShadow: isSelected 
          ? '0 25px 50px -12px rgba(99, 102, 241, 0.25)' 
          : undefined
      }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Gradient Background Overlay */}
      <div 
        className={cn(
          "absolute inset-0 bg-linear-to-br opacity-0 transition-opacity duration-500",
          config.bg,
          isSelected && "opacity-100"
        )} 
      />
      
      {/* Glowing orb decoration */}
      <div 
        className={cn(
          "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30 transition-opacity duration-500",
          strategy.riskLevel === 'low' && "bg-emerald-500",
          strategy.riskLevel === 'medium' && "bg-amber-500",
          strategy.riskLevel === 'high' && "bg-rose-500",
          isSelected && "opacity-50"
        )} 
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header with Icon and Selection Indicator */}
        <div className="flex items-start justify-between mb-6">
          <motion.div 
            className={cn(
              "w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center",
              SURFACE.glass.low,
              config.text
            )}
            animate={isSelected ? { scale: 1.1 } : { scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <StrategyIcon className="w-8 h-8 md:w-10 md:h-10" strokeWidth={1.5} />
          </motion.div>
          {isSelected && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/50"
            >
              <Check className="w-6 h-6 text-white" strokeWidth={3} />
            </motion.div>
          )}
        </div>

        {/* Title & Subtitle */}
        <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
          {strategy.title}
        </h3>
        <p className="text-slate-400 text-sm md:text-base mb-6">
          {strategy.subtitle}
        </p>

        {/* Expected Return - Highlight Box */}
        <div className={cn("mb-6 p-4 md:p-5 rounded-2xl", SURFACE.glass.low)}>
          <p className={cn("text-3xl md:text-4xl font-bold", config.text)}>
            {strategy.expectedReturn}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {strategy.expectedReturnDetail}
          </p>
        </div>

        {/* Risk Badge */}
        <div className="mb-4">
          <span className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm",
            "border backdrop-blur-sm",
            strategy.riskLevel === 'low' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
            strategy.riskLevel === 'medium' && "bg-amber-500/10 text-amber-400 border-amber-500/30",
            strategy.riskLevel === 'high' && "bg-rose-500/10 text-rose-400 border-rose-500/30",
          )}>
            <RiskIcon className="w-4 h-4" />
            {config.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-4">
          {strategy.description}
        </p>

        {/* Features List */}
        <div className="space-y-2 mb-4">
          {strategy.features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                strategy.riskLevel === 'low' && "bg-emerald-500",
                strategy.riskLevel === 'medium' && "bg-amber-500",
                strategy.riskLevel === 'high' && "bg-rose-500",
              )} />
              {feature}
            </div>
          ))}
        </div>

        {/* Protection */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Shield className="w-4 h-4 text-indigo-400" />
          <span>{strategy.protection}</span>
        </div>

        {/* Suitable For Tags */}
        <div className="space-y-2 mb-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
            Passer for deg som:
          </p>
          <div className="flex flex-wrap gap-2">
            {strategy.suitableFor.map((item, i) => (
              <span 
                key={i}
                className={cn("text-xs text-slate-300 px-3 py-1.5 rounded-lg", SURFACE.glass.low)}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Min Investment */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
          <span className="text-slate-500 text-sm">Minimumsbeløp</span>
          <span className="text-white font-semibold">{strategy.minInvestment}</span>
        </div>

        {/* Select Button */}
        <motion.button
          className={cn(
            "w-full mt-6 py-4 rounded-2xl font-semibold transition-all duration-300",
            isSelected 
              ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {isSelected ? '✓ Denne er valgt' : 'Velg denne strategien'}
        </motion.button>
      </div>
    </motion.div>
  );
}
