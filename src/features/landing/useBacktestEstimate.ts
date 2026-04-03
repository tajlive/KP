/**
 * useBacktestEstimate — Hook for å hente preaggregerte backtest-estimater
 * 
 * Bruker BACKTEST_PRESETS istedenfor live API-kall for:
 * - Raskere initial render
 * - Konsistente resultater på tvers av sesjoner
 * - Ingen avhengighet av eksterne API-kall på landing page
 */

import { useMemo } from 'react';
import {
  type BacktestPreset,
  type RiskProfile,
  getPreset,
  RISK_PROFILE_LABELS,
} from './backtestPresets';

export interface BacktestEstimate {
  preset: BacktestPreset;
  // Beregnet verdier basert på investedAmount
  values: {
    invested: number;
    pessimistic: number;
    expected: number;
    optimistic: number;
  };
  // Formatted strings for visning
  formatted: {
    invested: string;
    pessimistic: string;
    expected: string;
    optimistic: string;
    pessimisticReturn: string;
    expectedReturn: string;
    optimisticReturn: string;
    maxDrawdown: string;
    volatility: string;
  };
  // Metadata
  profile: {
    label: string;
    emoji: string;
    color: string;
  };
}

function formatNOK(value: number): string {
  return new Intl.NumberFormat('no-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  const pct = value * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`;
}

/**
 * Hook for å hente backtest-estimat basert på riskProfile, months og investedAmount
 */
export function useBacktestEstimate(
  riskProfile: RiskProfile,
  months: number,
  investedAmount: number
): BacktestEstimate | null {
  return useMemo(() => {
    const preset = getPreset(riskProfile, months);
    
    if (!preset) {
      return null;
    }

    // Beregn verdier
    const values = {
      invested: investedAmount,
      pessimistic: Math.round(investedAmount * (1 + preset.pessimisticReturn)),
      expected: Math.round(investedAmount * (1 + preset.expectedReturn)),
      optimistic: Math.round(investedAmount * (1 + preset.optimisticReturn)),
    };

    // Format for visning
    const formatted = {
      invested: formatNOK(values.invested),
      pessimistic: formatNOK(values.pessimistic),
      expected: formatNOK(values.expected),
      optimistic: formatNOK(values.optimistic),
      pessimisticReturn: formatPercent(preset.pessimisticReturn),
      expectedReturn: formatPercent(preset.expectedReturn),
      optimisticReturn: formatPercent(preset.optimisticReturn),
      maxDrawdown: formatPercent(preset.maxDrawdown),
      volatility: formatPercent(preset.volatility),
    };

    return {
      preset,
      values,
      formatted,
      profile: RISK_PROFILE_LABELS[riskProfile],
    };
  }, [riskProfile, months, investedAmount]);
}

/**
 * Hent equity curve data for charting
 * Genererer syntetisk curve basert på scenarier
 */
export function generateEquityCurve(
  investedAmount: number,
  months: number,
  pessimisticReturn: number,
  expectedReturn: number,
  optimisticReturn: number
): Array<{
  month: number;
  pessimistic: number;
  expected: number;
  optimistic: number;
}> {
  const data: Array<{
    month: number;
    pessimistic: number;
    expected: number;
    optimistic: number;
  }> = [];

  for (let i = 0; i <= months; i++) {
    const progress = i / months;
    
    // Bruk eksponensiell vekst for mer realistisk curve
    const pessimistic = investedAmount * Math.pow(1 + pessimisticReturn, progress);
    const expected = investedAmount * Math.pow(1 + expectedReturn, progress);
    const optimistic = investedAmount * Math.pow(1 + optimisticReturn, progress);

    data.push({
      month: i,
      pessimistic: Math.round(pessimistic),
      expected: Math.round(expected),
      optimistic: Math.round(optimistic),
    });
  }

  return data;
}

/**
 * Hook som returnerer equity curve data klar for Recharts
 */
export function useBacktestEquityCurve(
  estimate: BacktestEstimate | null,
  months: number
): Array<{
  month: number;
  pessimistic: number;
  expected: number;
  optimistic: number;
}> {
  return useMemo(() => {
    if (!estimate) {
      return [];
    }

    return generateEquityCurve(
      estimate.values.invested,
      months,
      estimate.preset.pessimisticReturn,
      estimate.preset.expectedReturn,
      estimate.preset.optimisticReturn
    );
  }, [estimate, months]);
}

// Re-eksporter typer for convenience
export type { BacktestPreset, RiskProfile };
export { RISK_PROFILE_LABELS, getPreset };
