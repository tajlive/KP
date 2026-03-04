'use client';

import { useState } from 'react';
import { 
  Brain, Shield, Scale, TrendingUp, Zap,
  Check, AlertTriangle, ChevronRight
} from 'lucide-react';
import { RiskLevel } from '@/types/paper-trading';
import { 
  RISK_LEVELS, RISK_PRESETS, getRiskColorClass, 
  getRecommendation, formatPct 
} from '@/lib/paper-trading/presets';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface RiskPanelMobileProps {
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

export function RiskPanelMobile({ selected, onSelect, disabled }: RiskPanelMobileProps) {
  const [showDetails, setShowDetails] = useState(false);
  const preset = RISK_PRESETS[selected];

  return (
    <div className="space-y-3">
      {/* Compact Risk Selector */}
      <div className="grid grid-cols-5 gap-1.5">
        {RISK_LEVELS.map((level) => {
          const p = RISK_PRESETS[level];
          const Icon = iconMap[p.icon as keyof typeof iconMap] || Shield;
          const isSelected = selected === level;
          
          return (
            <button
              key={level}
              disabled={disabled}
              onClick={() => onSelect(level)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl",
                "transition-all active:scale-95",
                isSelected 
                  ? cn("bg-zinc-800 border-2", getRiskColorClass(level).split(' ')[2])
                  : "bg-zinc-900/50 border-2 border-transparent opacity-60",
                disabled && "opacity-30 cursor-not-allowed"
              )}
            >
              <Icon 
                className="w-5 h-5" 
                style={{ color: isSelected ? p.color : '#71717a' }}
              />
              <span className={cn(
                "text-[10px] font-medium",
                isSelected ? "text-white" : "text-zinc-500"
              )}>
                {p.name.split('-')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Risk Summary */}
      <Sheet>
        <SheetTrigger asChild>
          <button className="w-full p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center justify-between active:bg-zinc-900 transition-colors">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${preset.color}20` }}
              >
                {(() => {
                  const Icon = iconMap[preset.icon as keyof typeof iconMap] || Shield;
                  return <Icon className="w-5 h-5" style={{ color: preset.color }} />;
                })()}
              </div>
              <div className="text-left">
                <p className="font-medium text-white">{preset.name}</p>
                <p className="text-xs text-zinc-500">{getRecommendation(selected)}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-500" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh] bg-zinc-950 border-zinc-800">
          <SheetHeader className="pb-4 border-b border-zinc-800">
            <SheetTitle className="text-white flex items-center gap-2">
              {(() => {
                const Icon = iconMap[preset.icon as keyof typeof iconMap] || Shield;
                return <Icon className="w-5 h-5" style={{ color: preset.color }} />;
              })()}
              {preset.name}
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 mt-6">
            {/* Description */}
            <p className="text-zinc-300 leading-relaxed">
              {preset.description}
            </p>

            {/* Key Stats */}
            <div className="grid grid-cols-2 gap-3">
              <DetailStat 
                label="Posisjonsstørrelse" 
                value={formatPct(preset.position_pct * 100)}
              />
              <DetailStat 
                label="Max Drawdown" 
                value={`${preset.max_drawdown_pct}%`}
              />
              <DetailStat 
                label="Leverage" 
                value={`${preset.leverage_max}x`}
              />
              <DetailStat 
                label="Max Positions" 
                value={preset.max_positions.toString()}
              />
            </div>

            {/* Stop Loss / Take Profit */}
            <div className="bg-zinc-900/50 rounded-xl p-4 space-y-3">
              <h4 className="font-medium text-white">Risk Management</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Stop Loss</span>
                <span className="text-red-400 font-medium">-{preset.stop_loss_pct}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Take Profit</span>
                <span className="text-emerald-400 font-medium">+{preset.take_profit_pct}%</span>
              </div>
              {preset.trailing_stop && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Trailing Stop</span>
                  <span className="text-blue-400 font-medium">Aktivert</span>
                </div>
              )}
            </div>

            {/* Warning */}
            {(selected === 'high' || selected === 'extreme') && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300">
                  {selected === 'extreme' 
                    ? 'Ekstrem risiko kan føre til betydelige tap. Kun for erfarne tradere.'
                    : 'Høy risiko betyr større svingninger. Sørg for at du har erfaring med volatile markeder.'}
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900/50 rounded-xl p-3">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}
