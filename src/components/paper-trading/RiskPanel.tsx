'use client';

import { useState } from 'react';
import { 
  Brain, Shield, Scale, TrendingUp, Zap,
  Check, AlertTriangle, Info
} from 'lucide-react';
import { RiskLevel } from '@/types/paper-trading';
import { 
  RISK_LEVELS, RISK_PRESETS, getRiskColorClass, 
  getRecommendation, formatPct 
} from '@/lib/paper-trading/presets';
import { cn } from '@/lib/utils';

interface RiskPanelProps {
  selected: RiskLevel;
  onSelect: (level: RiskLevel) => void;
  disabled?: boolean;
}

const iconMap = {
  Brain: Brain,
  Shield: Shield,
  Scale: Scale,
  TrendingUp: TrendingUp,
  Zap: Zap
};

export function RiskPanel({ selected, onSelect, disabled }: RiskPanelProps) {
  const [hovered, setHovered] = useState<RiskLevel | null>(null);
  const activeLevel = hovered || selected;
  const preset = RISK_PRESETS[activeLevel];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Velg Risikonivå</h3>
          <p className="text-sm text-zinc-400">
            Hvor mye risiko vil du ta med dine 1M USD?
          </p>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-medium border",
          getRiskColorClass(selected)
        )}>
          {RISK_PRESETS[selected].name}
        </div>
      </div>

      {/* 5 Risk Level Buttons */}
      <div className="grid grid-cols-5 gap-2">
        {RISK_LEVELS.map((level, idx) => {
          const p = RISK_PRESETS[level];
          const Icon = iconMap[p.icon as keyof typeof iconMap] || Shield;
          const isSelected = selected === level;
          
          return (
            <button
              key={level}
              disabled={disabled}
              onClick={() => onSelect(level)}
              onMouseEnter={() => setHovered(level)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "relative group flex flex-col items-center gap-2 p-3 rounded-xl",
                "transition-all duration-200 border-2",
                "hover:scale-105 active:scale-95",
                isSelected 
                  ? cn("bg-zinc-800 border-white/30", getRiskColorClass(level))
                  : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700",
                disabled && "opacity-50 cursor-not-allowed hover:scale-100"
              )}
            >
              {/* Icon */}
              <div 
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                  isSelected ? "bg-white/10" : "bg-zinc-800 group-hover:bg-zinc-700"
                )}
                style={{ color: p.color }}
              >
                <Icon className="w-5 h-5" />
              </div>

              {/* Label */}
              <span className={cn(
                "text-xs font-medium text-center leading-tight",
                isSelected ? "text-white" : "text-zinc-400"
              )}>
                {p.name}
              </span>

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-black" />
                </div>
              )}

              {/* Number badge */}
              <span className="absolute top-1 left-1 text-[10px] font-bold text-zinc-600">
                {idx + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* Details Panel */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-4">
        {/* Title & Description */}
        <div className="flex items-start gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${preset.color}20`, color: preset.color }}
          >
            {(() => {
              const Icon = iconMap[preset.icon as keyof typeof iconMap] || Shield;
              return <Icon className="w-5 h-5" />;
            })()}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-white">{preset.name}</h4>
            <p className="text-sm text-zinc-400 mt-0.5">{preset.description}</p>
          </div>
          <span className={cn(
            "px-2 py-1 rounded text-xs font-medium",
            getRiskColorClass(activeLevel)
          )}>
            {getRecommendation(activeLevel)}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox 
            label="Posisjonsstørrelse" 
            value={formatPct(preset.position_pct * 100)}
            subtext="per trade"
            color={preset.color}
          />
          <StatBox 
            label="Max Drawdown" 
            value={`${preset.max_drawdown_pct}%`}
            subtext="risiko"
            color={preset.color}
          />
          <StatBox 
            label="Leverage" 
            value={`${preset.leverage_max}x`}
            subtext="maks"
            color={preset.color}
          />
          <StatBox 
            label="Maks Positions" 
            value={preset.max_positions.toString()}
            subtext="samtidig"
            color={preset.color}
          />
        </div>

        {/* Stop Loss / Take Profit */}
        <div className="flex items-center gap-4 pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm text-zinc-400">
              Stop Loss: <span className="text-red-400">-{preset.stop_loss_pct}%</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-zinc-400">
              Take Profit: <span className="text-emerald-400">+{preset.take_profit_pct}%</span>
            </span>
          </div>
          {preset.trailing_stop && (
            <div className="flex items-center gap-1 ml-auto">
              <TrendingUp className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-blue-400">Trailing Stop</span>
            </div>
          )}
        </div>

        {/* Warning for high risk */}
        {(activeLevel === 'high' || activeLevel === 'extreme') && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">
              {activeLevel === 'extreme' 
                ? 'Ekstrem risiko kan føre til betydelige tap. Kun for erfarne tradere som forstår avanserte strategier.'
                : 'Høy risiko betyr større svingninger. Sørg for at du har erfaring med volatile markeder.'}
            </p>
          </div>
        )}
      </div>

      {/* Tooltip hint */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Info className="w-3 h-3" />
        <span>Hold musen over knappene for å se detaljer før du velger</span>
      </div>
    </div>
  );
}

function StatBox({ label, value, subtext, color }: { 
  label: string; 
  value: string; 
  subtext: string;
  color: string;
}) {
  return (
    <div className="bg-zinc-950/50 rounded-lg p-3">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-zinc-600">{subtext}</p>
    </div>
  );
}
