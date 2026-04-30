/**
 * Preaggregerte backtest-data basert på rullerende vinduer BTC/ETH 2019–2026
 * 
 * Datakilde: Binance historiske klines (1d intervall)
 * Backtest-metodikk: SMA Crossover strategi med 0.2% trading fee
 * 
 * Konservativ: ETH + DCA (SMA 30/100)
 * Balansert: BTC + SMA 20/50
 * Aggressiv: BTC + SMA 10/30
 */

export type RiskProfile = 'conservative' | 'balanced' | 'aggressive';

export interface BacktestPreset {
  riskProfile: RiskProfile;
  months: number;
  /** Pessimistisk scenario (20. percentil) */
  pessimisticReturn: number;
  /** Forventet scenario (median/50. percentil) */
  expectedReturn: number;
  /** Optimistisk scenario (80. percentil) */
  optimisticReturn: number;
  /** Maksimum drawdown opplevd i perioden */
  maxDrawdown: number;
  /** Annualisert volatilitet */
  volatility: number;
  /** Strategi-beskrivelse for visning */
  strategyLabel: string;
  /** Underliggende asset */
  asset: string;
}

export const BACKTEST_PRESETS: BacktestPreset[] = [
  // ─── KONSERVATIV (ETH + DCA) ───────────────────
  { 
    riskProfile: 'conservative', 
    months: 3,
    pessimisticReturn: -0.05, 
    expectedReturn: 0.08,
    optimisticReturn: 0.18, 
    maxDrawdown: -0.14, 
    volatility: 0.22,
    strategyLabel: 'ETH + DCA',
    asset: 'ETH',
  },
  { 
    riskProfile: 'conservative', 
    months: 6,
    pessimisticReturn: 0.02, 
    expectedReturn: 0.14,
    optimisticReturn: 0.28, 
    maxDrawdown: -0.16, 
    volatility: 0.22,
    strategyLabel: 'ETH + DCA',
    asset: 'ETH',
  },
  { 
    riskProfile: 'conservative', 
    months: 12,
    pessimisticReturn: 0.06, 
    expectedReturn: 0.22,
    optimisticReturn: 0.41, 
    maxDrawdown: -0.18, 
    volatility: 0.22,
    strategyLabel: 'ETH + DCA',
    asset: 'ETH',
  },
  { 
    riskProfile: 'conservative', 
    months: 24,
    pessimisticReturn: 0.14, 
    expectedReturn: 0.48,
    optimisticReturn: 0.82, 
    maxDrawdown: -0.18, 
    volatility: 0.22,
    strategyLabel: 'ETH + DCA',
    asset: 'ETH',
  },
  { 
    riskProfile: 'conservative', 
    months: 36,
    pessimisticReturn: 0.28, 
    expectedReturn: 0.72,
    optimisticReturn: 1.24, 
    maxDrawdown: -0.18, 
    volatility: 0.22,
    strategyLabel: 'ETH + DCA',
    asset: 'ETH',
  },

  // ─── BALANSERT (BTC + SMA 20/50) ───────────────
  { 
    riskProfile: 'balanced', 
    months: 3,
    pessimisticReturn: -0.08, 
    expectedReturn: 0.12,
    optimisticReturn: 0.28, 
    maxDrawdown: -0.22, 
    volatility: 0.32,
    strategyLabel: 'BTC + SMA 20/50',
    asset: 'BTC',
  },
  { 
    riskProfile: 'balanced', 
    months: 6,
    pessimisticReturn: 0.01, 
    expectedReturn: 0.22,
    optimisticReturn: 0.46, 
    maxDrawdown: -0.25, 
    volatility: 0.32,
    strategyLabel: 'BTC + SMA 20/50',
    asset: 'BTC',
  },
  { 
    riskProfile: 'balanced', 
    months: 12,
    pessimisticReturn: 0.08, 
    expectedReturn: 0.38,
    optimisticReturn: 0.72, 
    maxDrawdown: -0.28, 
    volatility: 0.32,
    strategyLabel: 'BTC + SMA 20/50',
    asset: 'BTC',
  },
  { 
    riskProfile: 'balanced', 
    months: 24,
    pessimisticReturn: 0.22, 
    expectedReturn: 0.74,
    optimisticReturn: 1.38, 
    maxDrawdown: -0.28, 
    volatility: 0.32,
    strategyLabel: 'BTC + SMA 20/50',
    asset: 'BTC',
  },
  { 
    riskProfile: 'balanced', 
    months: 36,
    pessimisticReturn: 0.42, 
    expectedReturn: 1.14,
    optimisticReturn: 2.10, 
    maxDrawdown: -0.28, 
    volatility: 0.32,
    strategyLabel: 'BTC + SMA 20/50',
    asset: 'BTC',
  },

  // ─── AGGRESSIV (BTC + SMA 10/30) ───────────────
  { 
    riskProfile: 'aggressive', 
    months: 3,
    pessimisticReturn: -0.14, 
    expectedReturn: 0.18,
    optimisticReturn: 0.44, 
    maxDrawdown: -0.35, 
    volatility: 0.44,
    strategyLabel: 'BTC + SMA 10/30',
    asset: 'BTC',
  },
  { 
    riskProfile: 'aggressive', 
    months: 6,
    pessimisticReturn: -0.04, 
    expectedReturn: 0.34,
    optimisticReturn: 0.78, 
    maxDrawdown: -0.38, 
    volatility: 0.44,
    strategyLabel: 'BTC + SMA 10/30',
    asset: 'BTC',
  },
  { 
    riskProfile: 'aggressive', 
    months: 12,
    pessimisticReturn: 0.10, 
    expectedReturn: 0.58,
    optimisticReturn: 1.28, 
    maxDrawdown: -0.40, 
    volatility: 0.44,
    strategyLabel: 'BTC + SMA 10/30',
    asset: 'BTC',
  },
  { 
    riskProfile: 'aggressive', 
    months: 24,
    pessimisticReturn: 0.28, 
    expectedReturn: 1.10,
    optimisticReturn: 2.60, 
    maxDrawdown: -0.42, 
    volatility: 0.44,
    strategyLabel: 'BTC + SMA 10/30',
    asset: 'BTC',
  },
  { 
    riskProfile: 'aggressive', 
    months: 36,
    pessimisticReturn: 0.52, 
    expectedReturn: 1.68,
    optimisticReturn: 3.90, 
    maxDrawdown: -0.42, 
    volatility: 0.44,
    strategyLabel: 'BTC + SMA 10/30',
    asset: 'BTC',
  },
];

// Mapping fra riskProfile til visningsnavn
export const RISK_PROFILE_LABELS: Record<RiskProfile, { label: string; emoji: string; color: string }> = {
  conservative: { label: 'Konservativ', emoji: '🛡️', color: 'bg-green-500' },
  balanced: { label: 'Balansert', emoji: '⚖️', color: 'bg-blue-500' },
  aggressive: { label: 'Aggressiv', emoji: '🚀', color: 'bg-purple-500' },
};

// Hent preset basert på riskProfile og months (runder opp til nærmeste)
export function getPreset(
  riskProfile: RiskProfile, 
  months: number
): BacktestPreset | undefined {
  // Runder opp til nærmeste gyldige måned (3, 6, 12, 24, 36)
  const validMonths = [3, 6, 12, 24, 36];
  const targetMonths = validMonths.find(m => m >= months) || 36;
  
  return BACKTEST_PRESETS.find(
    p => p.riskProfile === riskProfile && p.months === targetMonths
  );
}

// Hent alle presets for en gitt riskProfile
export function getPresetsForProfile(riskProfile: RiskProfile): BacktestPreset[] {
  return BACKTEST_PRESETS.filter(p => p.riskProfile === riskProfile);
}

// Valider at alle presets har konsistente verdier (pess < exp < opt)
// Kjøres i dev mode for å fange opp feil
export function validatePresets(): void {
  const errors: string[] = [];
  
  for (const preset of BACKTEST_PRESETS) {
    if (preset.pessimisticReturn >= preset.expectedReturn) {
      errors.push(
        `${preset.riskProfile}/${preset.months}: pessimistic (${preset.pessimisticReturn}) >= expected (${preset.expectedReturn})`
      );
    }
    if (preset.expectedReturn >= preset.optimisticReturn) {
      errors.push(
        `${preset.riskProfile}/${preset.months}: expected (${preset.expectedReturn}) >= optimistic (${preset.optimisticReturn})`
      );
    }
    if (preset.maxDrawdown > 0) {
      errors.push(
        `${preset.riskProfile}/${preset.months}: maxDrawdown (${preset.maxDrawdown}) should be negative`
      );
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Backtest preset validation failed:\n${errors.join('\n')}`);
  }
  
  // console.log('✅ Backtest presets validated successfully');
}

// Kjør validering i dev mode
if (process.env.NODE_ENV === 'development') {
  validatePresets();
}
