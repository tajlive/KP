/**
 * Realistic ROI Calculator - KLA-244
 * Beregner ROI basert på ekte historiske data
 */

import { getHistoricalReturns, HistoricalReturnData } from './historical';

export interface ROIScenario {
  optimistic: number;
  expected: number;
  pessimistic: number;
  equityCurve: Array<{ month: number; optimistic: number; expected: number; pessimistic: number }>;
}

export async function calculateROI(
  principal: number,
  riskProfile: 'konservativ' | 'balansert' | 'aggressiv',
  months: number
): Promise<{
  scenarios: ROIScenario;
  historical: HistoricalReturnData;
  formatted: {
    principal: string;
    optimistic: string;
    expected: string;
    pessimistic: string;
    returns: {
      optimistic: string;
      expected: string;
      pessimistic: string;
    };
  };
}> {
  // Hent historiske data
  const historical = await getHistoricalReturns(riskProfile, months);
  
  // Beregn månedlig return fra historisk data
  const baseMonthlyReturn = historical.totalReturn / months;
  
  // Generer scenarier med Monte Carlo-variasjon
  const scenarios = generateScenarios(principal, baseMonthlyReturn, historical.volatility, months);
  
  // Formater output
  const formatNOK = (value: number) =>
    new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      maximumFractionDigits: 0,
    }).format(value);
  
  const formatPct = (value: number) => {
    const pct = ((value / principal) - 1) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`;
  };
  
  return {
    scenarios,
    historical,
    formatted: {
      principal: formatNOK(principal),
      optimistic: formatNOK(scenarios.optimistic),
      expected: formatNOK(scenarios.expected),
      pessimistic: formatNOK(scenarios.pessimistic),
      returns: {
        optimistic: formatPct(scenarios.optimistic),
        expected: formatPct(scenarios.expected),
        pessimistic: formatPct(scenarios.pessimistic),
      },
    },
  };
}

function generateScenarios(
  principal: number,
  baseMonthlyReturn: number,
  volatility: number,
  months: number
): ROIScenario {
  const equityCurve: ROIScenario['equityCurve'] = [];
  
  // Multiplikatorer for ulike scenarier
  const optimisticMult = 1 + (volatility * 0.5); // Bedre enn forventet
  const expectedMult = 1;
  const pessimisticMult = 1 - (volatility * 0.3); // Verre enn forventet
  
  let optimisticValue = principal;
  let expectedValue = principal;
  let pessimisticValue = principal;
  
  for (let i = 0; i <= months; i++) {
    if (i === 0) {
      equityCurve.push({
        month: i,
        optimistic: optimisticValue,
        expected: expectedValue,
        pessimistic: pessimisticValue,
      });
      continue;
    }
    
    // Legg til støy for realisme
    const noise = (Math.random() - 0.5) * volatility * 0.1;
    
    optimisticValue *= (1 + baseMonthlyReturn * optimisticMult + noise);
    expectedValue *= (1 + baseMonthlyReturn * expectedMult + noise * 0.5);
    pessimisticValue *= (1 + baseMonthlyReturn * pessimisticMult - noise);
    
    // Sørg for at pessimistisk ikke går under 50% av principal
    pessimisticValue = Math.max(pessimisticValue, principal * 0.5);
    
    equityCurve.push({
      month: i,
      optimistic: Math.round(optimisticValue),
      expected: Math.round(expectedValue),
      pessimistic: Math.round(pessimisticValue),
    });
  }
  
  return {
    optimistic: equityCurve[equityCurve.length - 1].optimistic,
    expected: equityCurve[equityCurve.length - 1].expected,
    pessimistic: equityCurve[equityCurve.length - 1].pessimistic,
    equityCurve,
  };
}

// Hjelpefunksjon for å hente data uten å beregne full ROI
export async function getQuickEstimate(
  riskProfile: 'konservativ' | 'balansert' | 'aggressiv',
  months: number
): Promise<{
  expectedReturn: number; // som desimal, f.eks. 0.68 for 68%
  volatility: number;
  maxDrawdown: number;
}> {
  const historical = await getHistoricalReturns(riskProfile, months);
  return {
    expectedReturn: historical.totalReturn,
    volatility: historical.volatility,
    maxDrawdown: historical.maxDrawdown,
  };
}
