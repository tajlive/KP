/**
 * Risk Presets Configuration
 * 5 levels from Auto-Low to Extreme
 */

import { RiskPreset, RiskLevel } from '@/types/paper-trading';

export const RISK_PRESETS: Record<RiskLevel, RiskPreset> = {
  auto_low: {
    id: 'auto_low',
    name: 'Auto-Lav',
    nameEn: 'Auto Low',
    description: 'AI tilpasser risiko dynamisk basert på markedsvolatilitet og trendstyrke. Perfekt for nybegynnere.',
    color: '#10B981', // Emerald 500
    icon: 'Brain',
    position_pct: 0.01,        // 1% per trade
    max_drawdown_pct: 3,       // 3% max drawdown
    atr_mult: 1.5,
    volatility_scale: 0.8,
    max_positions: 3,
    leverage_max: 1,
    stop_loss_pct: 2,
    take_profit_pct: 6,
    trailing_stop: true,
    rebalance_freq: 'daily'
  },
  low: {
    id: 'low',
    name: 'Lav',
    nameEn: 'Low',
    description: 'Konservativ strategi med fokus på kapitalbevaring. Små, stabile gevinster over tid.',
    color: '#3B82F6', // Blue 500
    icon: 'Shield',
    position_pct: 0.02,        // 2% per trade
    max_drawdown_pct: 5,       // 5% max drawdown
    atr_mult: 2.0,
    volatility_scale: 1.0,
    max_positions: 5,
    leverage_max: 1,
    stop_loss_pct: 3,
    take_profit_pct: 9,
    trailing_stop: false,
    rebalance_freq: 'weekly'
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    nameEn: 'Standard',
    description: 'Balansert risiko/avlønning som passer de fleste tradere. Vår mest populære innstilling.',
    color: '#8B5CF6', // Violet 500
    icon: 'Scale',
    position_pct: 0.05,        // 5% per trade
    max_drawdown_pct: 10,      // 10% max drawdown
    atr_mult: 2.5,
    volatility_scale: 1.2,
    max_positions: 8,
    leverage_max: 2,
    stop_loss_pct: 3,
    take_profit_pct: 9,
    trailing_stop: true,
    rebalance_freq: 'weekly'
  },
  high: {
    id: 'high',
    name: 'Høy',
    nameEn: 'High',
    description: 'Aggressiv vekst med høyere risiko. For tradere som tåler større svingninger.',
    color: '#F59E0B', // Amber 500
    icon: 'TrendingUp',
    position_pct: 0.10,        // 10% per trade
    max_drawdown_pct: 20,      // 20% max drawdown
    atr_mult: 3.0,
    volatility_scale: 1.5,
    max_positions: 12,
    leverage_max: 3,
    stop_loss_pct: 5,
    take_profit_pct: 15,
    trailing_stop: true,
    rebalance_freq: 'daily'
  },
  extreme: {
    id: 'extreme',
    name: 'Ekstrem',
    nameEn: 'Extreme',
    description: 'Maksimal risiko for erfarne tradere. Kun for de som virkelig forstår risikoen.',
    color: '#EF4444', // Red 500
    icon: 'Zap',
    position_pct: 0.20,        // 20% per trade
    max_drawdown_pct: 40,      // 40% max drawdown
    atr_mult: 4.0,
    volatility_scale: 2.0,
    max_positions: 20,
    leverage_max: 5,
    stop_loss_pct: 8,
    take_profit_pct: 24,
    trailing_stop: true,
    rebalance_freq: 'daily'
  }
};

export const RISK_LEVELS: RiskLevel[] = ['auto_low', 'low', 'standard', 'high', 'extreme'];

// Format currency
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Format percentage
export function formatPct(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

// Get preset by ID
export function getPreset(level: RiskLevel): RiskPreset {
  return RISK_PRESETS[level];
}

// Get color class for risk level
export function getRiskColorClass(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    auto_low: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    low: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    standard: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
    high: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    extreme: 'text-red-500 bg-red-500/10 border-red-500/20'
  };
  return colors[level];
}

// Get recommendation text
export function getRecommendation(level: RiskLevel): string {
  const recs: Record<RiskLevel, string> = {
    auto_low: 'Anbefalt for nybegynnere',
    low: 'Bra for forsiktige investorer',
    standard: 'Mest populære valg',
    high: 'Krever erfaring',
    extreme: 'Kun for eksperter'
  };
  return recs[level];
}
