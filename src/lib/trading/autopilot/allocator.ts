export interface Allocation {
  pair: string;
  capitalUsdc: number;
}

const EDGE_WEIGHT: Record<string, number> = {
  XBTUSDC: 10, ETHUSDC: 9, SOLUSDC: 6, ADAUSDC: 5, DOTUSDC: 4,
};

function getEligiblePairs(equityUsdc: number): string[] {
  if (equityUsdc < 50) return ["XBTUSDC"];
  if (equityUsdc < 250) return ["XBTUSDC", "ETHUSDC", "SOLUSDC"];
  return ["XBTUSDC", "ETHUSDC", "SOLUSDC", "ADAUSDC", "DOTUSDC"];
}

export function allocateCapital(equityUsdc: number): Allocation[] {
  const pairs = getEligiblePairs(equityUsdc);
  const w = pairs.map((p) => EDGE_WEIGHT[p] ?? 1);
  const tw = w.reduce((a, b) => a + b, 0);
  return pairs.map((pair, i) => ({
    pair,
    capitalUsdc: Math.max(Math.round((equityUsdc * w[i]) / tw * 100) / 100, 8),
  }));
}

export function validateAllocations(
  alloc: Allocation[],
  total: number,
): { valid: true } | { valid: false; reason: string } {
  for (const a of alloc) {
    if (a.capitalUsdc < 8) return { valid: false, reason: `${a.pair}: ${a.capitalUsdc.toFixed(2)} < 8 USDC` };
  }
  const sum = alloc.reduce((s, a) => s + a.capitalUsdc, 0);
  if (sum > total * 1.01) return { valid: false, reason: `Sum ${sum.toFixed(2)} > total ${total.toFixed(2)}` };
  return { valid: true };
}
