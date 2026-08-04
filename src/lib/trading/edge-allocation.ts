/**
 * Edge-scoring for symboluniverset.
 *
 * Rangerer trading-par etter dokumentert historisk ytelse i plattformens
 * egne trades (ren æra: kun trades etter 2026-07-30 11:00 UTC — se
 * klarpakke-trading-data-cleanup for kontekst om forurensede data).
 *
 * Filosofi (konkurrent-bekreftet 2026-08-04):
 * - AI brukes KUN ved rebalansering (1×/uke) — aldri per trade
 * - Mekanisk grid kjører 24/7 mellom rebalanseringer
 * - Kapital vektes mot symboler med målt positiv edge
 *
 * Scoring:
 *   score = expectancy  (avg realized P&L per lukket trade, NOK)
 * med terskler:
 *   - MIN_TRADES_FOR_SCORE: færre trades → nøytral score (prior-default)
 *   - Nøytrale symboler beholder plass i universet med basis-vekt
 */

/** Ren-æra cutoff — trades før dette er forurensede og teller ikke. */
export const CLEAN_ERA_CUTOFF = "2026-07-30T11:00:00.000Z";

/** Minimum antall lukkede trades før expectancy-score er pålitelig. */
export const MIN_TRADES_FOR_SCORE = 10;

/** Kanonisk symbolunivers (alle par plattformen kan velge blant). */
export const SYMBOL_UNIVERSE = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "AVAXUSDT",
  "DOGEUSDT",
  "LINKUSDT",
  "ADAUSDT",
  "DOTUSDT",
  "UNIUSDT",
  "POLUSDT",
] as const;

export type UniverseSymbol = (typeof SYMBOL_UNIVERSE)[number];

export interface SymbolEdge {
  symbol: string;
  closedTrades: number;
  totalPnl: number;
  /** Avg realized P&L per lukket trade (NOK). 0 ved ingen data. */
  expectancy: number;
  /** True når closedTrades >= MIN_TRADES_FOR_SCORE. */
  scored: boolean;
}

export interface Allocation {
  symbol: string;
  /** Andel av total allokering (0-1). Summerer til 1. */
  weight: number;
  /** NOK-beløp for dette symbolet. */
  capitalNok: number;
}

export interface AllocationPlan {
  allocations: Allocation[];
  /** Symboler som ble valgt (topp N). */
  universe: string[];
  /** Symboler som falt ut av universet (hadde vært med i en flat 10-liste). */
  dropped: string[];
  computedAt: string;
}

/** Råstatistikk per symbol fra trades-tabellen. */
export interface RawSymbolStats {
  trading_pair: string;
  closed: number;
  pnl_nok: number;
}

/**
 * Beregn edge-score per symbol fra rå trade-statistikk.
 * Ren funksjon — testbar uten DB.
 */
export function computeSymbolEdges(stats: RawSymbolStats[]): SymbolEdge[] {
  const byPair = new Map(stats.map((s) => [s.trading_pair, s]));

  return SYMBOL_UNIVERSE.map((symbol) => {
    const raw = byPair.get(symbol);
    const closed = raw?.closed ?? 0;
    const pnl = raw?.pnl_nok ?? 0;
    const scored = closed >= MIN_TRADES_FOR_SCORE;
    return {
      symbol,
      closedTrades: closed,
      totalPnl: pnl,
      expectancy: scored ? pnl / closed : 0,
      scored,
    };
  });
}

/**
 * Velg topp-N symboler og vekt kapital etter edge.
 *
 * Regler:
 * 1. Scored symboler rangeres etter expectancy (høyest først).
 * 2. Symboler med NEGATIV expectancy droppes helt (ingen kapital til tapere).
 * 3. Positive scorere får vekt proporsjonalt med expectancy.
 * 4. Uscorede symboler (for få trades) får basis-vekt (floor) så lenge
 *    det er plass — nye symboler må kunne bevise seg.
 * 5. Minst 2 symboler i universet alltid (diversifisering).
 * 6. Vekter normaliseres til å summere 1; kapital fordeles helt (floor)
 *    med rest til største vekt.
 */
export function buildAllocationPlan(
  edges: SymbolEdge[],
  totalCapitalNok: number,
  universeSize = 10,
): AllocationPlan {
  const floorWeight = 0.05; // 5% basis for uscorede symboler

  const scoredPositive = edges
    .filter((e) => e.scored && e.expectancy > 0)
    .sort((a, b) => b.expectancy - a.expectancy);
  const unscored = edges.filter((e) => !e.scored);

  // Universet: positive scorere først, fyll opp med uscorede
  const universe: SymbolEdge[] = [];
  for (const e of scoredPositive) {
    if (universe.length < universeSize) universe.push(e);
  }
  for (const e of unscored) {
    if (universe.length < universeSize) universe.push(e);
  }

  // Diversifiseringsguard: aldri mindre enn 2 symboler i universet
  if (universe.length < 2) {
    for (const e of edges) {
      if (!universe.includes(e)) {
        universe.push(e);
        if (universe.length >= 2) break;
      }
    }
  }

  const dropped = SYMBOL_UNIVERSE.filter(
    (s) => !universe.some((u) => u.symbol === s),
  );

  // Vekting: scored → proporsjonal med expectancy; uscored → floor
  const expectancySum = scoredPositive
    .filter((e) => universe.includes(e))
    .reduce((sum, e) => sum + e.expectancy, 0);
  const unscoredInUniverse = universe.filter((e) => !e.scored);

  let remaining = 1 - floorWeight * unscoredInUniverse.length;
  if (remaining < 0) remaining = 0;

  const weights = new Map<string, number>();
  for (const e of universe) {
    if (!e.scored) {
      weights.set(e.symbol, floorWeight);
    } else if (expectancySum > 0) {
      weights.set(e.symbol, (e.expectancy / expectancySum) * remaining);
    } else {
      weights.set(e.symbol, remaining / universe.length);
    }
  }

  // Normaliser (floor-justert) og fordel kapital
  const weightSum = [...weights.values()].reduce((a, b) => a + b, 0);
  const allocations: Allocation[] = universe.map((e) => {
    const w = (weights.get(e.symbol) ?? 0) / weightSum;
    return { symbol: e.symbol, weight: w, capitalNok: Math.floor(totalCapitalNok * w) };
  });

  // Rest fra floor-avrunding → største vekt (hele balansen allokeres)
  const allocated = allocations.reduce((s, a) => s + a.capitalNok, 0);
  const rest = totalCapitalNok - allocated;
  if (rest !== 0 && allocations.length > 0) {
    const top = allocations.reduce((a, b) => (a.weight >= b.weight ? a : b));
    top.capitalNok += rest;
  }

  return {
    allocations,
    universe: universe.map((e) => e.symbol),
    dropped: [...dropped],
    computedAt: new Date().toISOString(),
  };
}
