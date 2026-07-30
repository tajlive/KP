/**
 * Risikostyring — stop-loss, take-profit, posisjonsstørrelse.
 */

import type { RiskCheck, SmartTraderConfig, IndicatorSnapshot } from "./types.ts";

/** Valider at et kjøpssignal er innenfor risikoparametrene */
export function validateBuyRisk(
  config: SmartTraderConfig,
  currentCapital: number,
  currentPrice: number,
): RiskCheck {
  // Sjekk minimumskapital
  if (currentCapital < config.minCapitalNOK * (100 / config.positionSizePct)) {
    return {
      allowed: false,
      reason: `Kapital ${currentCapital} NOK er for lav. Minimum ${config.minCapitalNOK} NOK kreves.`,
    };
  }

  const stopLoss = currentPrice * (1 - config.stopLossPct / 100);
  const takeProfit = currentPrice * (1 + config.takeProfitPct / 100);

  // Sjekk at stop-loss er under entry price (alltid sant for kjøp)
  if (stopLoss >= currentPrice) {
    return { allowed: false, reason: 'Stop-loss må være under inngangspris' };
  }

  return {
    allowed: true,
    stopLossPrice: stopLoss,
    takeProfitPrice: takeProfit,
  };
}

/** Sjekk om en åpen posisjon skal lukkes via SL/TP */
export function checkPositionExit(
  entryPrice: number,
  currentPrice: number,
  config: SmartTraderConfig,
): 'stop_loss' | 'take_profit' | 'hold' {
  if (entryPrice <= 0) return 'hold';

  const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;

  if (pnlPct <= -config.stopLossPct) {
    return 'stop_loss';
  }
  if (pnlPct >= config.takeProfitPct) {
    return 'take_profit';
  }

  return 'hold';
}

/** Beregn posisjonsstørrelse basert på kapital og risiko
 * 
 * 2026-07-30: currentPrice forventes nå å være i NOK for paper-sesjoner.
 */
export function calculatePositionSize(
  capital: number,
  currentPrice: number,
  config: SmartTraderConfig,
): number {
  const maxAmount = capital * (config.positionSizePct / 100);
  const quantity = maxAmount / currentPrice;
  // Avrund til 4 desimaler
  return Math.round(quantity * 10000) / 10000;
}

/** Logg risk-sjekk til indikator-snapshot */
export function buildRiskSnapshot(
  entryPrice: number,
  currentPrice: number,
  config: SmartTraderConfig,
  indicators: IndicatorSnapshot,
): Record<string, unknown> {
  const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
  return {
    ...indicators,
    stopLoss: entryPrice * (1 - config.stopLossPct / 100),
    takeProfit: entryPrice * (1 + config.takeProfitPct / 100),
    pnlPct: Math.round(pnlPct * 100) / 100,
    riskLevel: pnlPct <= -config.stopLossPct / 2 ? 'high' : pnlPct >= config.takeProfitPct / 2 ? 'taking_profit' : 'normal',
  };
}
