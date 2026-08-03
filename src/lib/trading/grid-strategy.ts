/**
 * Grid Trading Strategy — verdensledende standard (Pionex/3Commas/Bitsgap)
 * 
 * Prinsipp: Kjøp lavt, selg høyt i forhåndsdefinerte intervaller.
 * Tjener på volatilitet UTEN å trenge trend — perfekt for crypto (70% sidelengs).
 * 
 * Logikk:
 * 1. Definer grid: [lower, upper] delt i N nivåer
 * 2. Hver grid-celle har en kjøps- og salgspris
 * 3. Når pris faller til kjøpsnivå → kjøp
 * 4. Når pris stiger til salgsnivå → selg
 * 5. Repeter — hver svingning = gevinst
 */

export interface GridConfig {
  symbol: string;
  lowerPrice: number;      // Nedre grense for grid
  upperPrice: number;      // Øvre grense for grid
  gridLevels: number;      // Antall nivåer (typisk 5-20)
  amountPerGrid: number;   // NOK per grid-nivå
  currentPrice: number;    // Nåværende markedspris
}

export interface GridLevel {
  level: number;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  status: "empty" | "bought" | "sold";
  dcaLevel?: number; // DCA under bunn: 1=lett, 2=medium, 3=tung
  sizeMultiplier?: number; // DCA: 1.0/1.5/2.0 — brukes av execution til posisjons-sizing
}

export interface GridSignal {
  action: "buy" | "sell" | "wait";
  level?: GridLevel;
  reason: string;
  expectedProfitPct: number;
  sellType?: "trailing" | "grid"; // satt kun ved action="sell" — for audit/reasonCode
  allBuyLevels?: GridLevel[]; // alle empty nivåer under pris (deploy-all) — satt kun ved action="buy"
}

/** DCA under bunn: 3 nivåer under laveste grid, progressivt større beløp */
const DCA_LEVELS_PCT = [0.95, 0.90, 0.85];
const DCA_SIZE_MULTIPLIER = [1.0, 1.5, 2.0];

/** Trailing stop: selg når pris ≥ 102% av kjøpspris */
const TRAILING_ACTIVATION_PCT = 1.02;

/** Markedsregime: bruk 24h-endring til å detektere trend vs sideways */
export type MarketRegime = "trending_up" | "trending_down" | "sideways";

export function detectMarketRegime(change24h: number, volatility24h: number): MarketRegime {
  // Sterk bevegelse → trend; ellers sideways
  if (change24h > 5 && volatility24h > 8) return "trending_up";
  if (change24h < -5 && volatility24h > 8) return "trending_down";
  return "sideways";
}

/** Juster grid-parametere basert på markedsregime */
export function adjustGridForRegime(
  grid: Omit<GridConfig, "symbol" | "currentPrice">,
  regime: MarketRegime,
  currentPrice: number
): Omit<GridConfig, "symbol" | "currentPrice"> {
  switch (regime) {
    case "trending_up":
      // I opptrend: tettere grid, prioriter salg (fang profitt)
      return {
        ...grid,
        gridLevels: Math.max(5, Math.round(grid.gridLevels * 0.7)),
        upperPrice: currentPrice * 1.15,  // mer rom oppover
        amountPerGrid: grid.amountPerGrid * 0.7,  // mindre per nivå
      };
    case "trending_down":
      // I nedtrend: brede nivåer, mindre kjøp (DCA under bunn håndterer resten)
      return {
        ...grid,
        gridLevels: Math.max(5, Math.round(grid.gridLevels * 0.5)),
        amountPerGrid: grid.amountPerGrid * 0.5,
      };
    default: // sideways — best for grid!
      return grid;
  }
}

/**
 * Generer grid-nivåer basert på konfig
 */
export function generateGridLevels(config: GridConfig): GridLevel[] {
  const { lowerPrice, upperPrice, gridLevels, amountPerGrid } = config;
  const levels: GridLevel[] = [];
  const step = (upperPrice - lowerPrice) / gridLevels;
  
  for (let i = 0; i < gridLevels; i++) {
    const buyPrice = lowerPrice + (i * step);
    const sellPrice = lowerPrice + ((i + 1) * step);
    const quantity = amountPerGrid / buyPrice;
    
    levels.push({
      level: i,
      buyPrice,
      sellPrice,
      quantity,
      status: "empty",
    });
  }
  
  return levels;
}

/**
 * Evaluer grid-signal basert på nåværende pris
 * 
 * Standard grid-bot logikk (Pionex/3Commas):
 * - Prisen har en "grid-celle" bestemt av prisnivå
 * - BUY når pris faller TIL cellens buyPrice
 * - SELL når pris stiger TIL cellens sellPrice (hvis kjøpt)
 * - WAIT ellers
 */
export function evaluateGridSignal(
  config: GridConfig,
  levels: GridLevel[],
  currentPrice: number
): GridSignal {
  // ═════════════════════════════════════════════════════════════════
  // PRIORITET 0 — SELL: realiser profitt FØR ny kapital deployeres.
  // Kjøres ALLTID, uavhengig av om prisen er under/over/i grid.
  // Sjekker ALLE kjøpte nivåer (vanlige celler + persistede DCA-nivåer).
  // Én sell per evaluering — velg høyest profitt.
  // ═════════════════════════════════════════════════════════════════
  let bestSell: { level: GridLevel; profitPct: number; reason: string; sellType: "trailing" | "grid" } | null = null;

  for (const l of levels) {
    if (l.status !== "bought") continue;

    // Trailing: pris ≥ kjøpspris + 2% → selg til markedspris
    const trailingThreshold = l.buyPrice * TRAILING_ACTIVATION_PCT;
    if (currentPrice >= trailingThreshold) {
      const profitPct = ((currentPrice - l.buyPrice) / l.buyPrice) * 100;
      if (!bestSell || profitPct > bestSell.profitPct) {
        bestSell = {
          level: l, profitPct, sellType: "trailing",
          reason: `📈 Trailing sell @ ${currentPrice.toFixed(2)} (kjøpt @ ${l.buyPrice.toFixed(2)}, +${profitPct.toFixed(1)}%)`,
        };
      }
      continue;
    }

    // Fast sell: pris ≥ sellPrice (når trailing ikke er utløst — små spread)
    if (currentPrice >= l.sellPrice) {
      const profitPct = ((l.sellPrice - l.buyPrice) / l.buyPrice) * 100;
      if (!bestSell || profitPct > bestSell.profitPct) {
        bestSell = {
          level: l, profitPct, sellType: "grid",
          reason: `Grid sell @ ${l.sellPrice.toFixed(2)} (nivå ${l.level}, +${profitPct.toFixed(1)}%)`,
        };
      }
    }
  }

  if (bestSell) {
    return {
      action: "sell", level: bestSell.level,
      reason: bestSell.reason, expectedProfitPct: bestSell.profitPct,
      sellType: bestSell.sellType,
    };
  }

  // ═════════════════════════════════════════════════════════════════
  // PRIORITET 1 — BUY: DCA under grid-bunn (progressivt større kjøp)
  // ═════════════════════════════════════════════════════════════════
  if (currentPrice < config.lowerPrice) {
    const lowestBuy = levels[0].buyPrice;
    for (let dcaIdx = 0; dcaIdx < DCA_LEVELS_PCT.length; dcaIdx++) {
      const dcaPrice = config.lowerPrice * DCA_LEVELS_PCT[dcaIdx];
      const existingDca = levels.find(l => l.dcaLevel === dcaIdx + 1);
      if (currentPrice <= dcaPrice && (!existingDca || existingDca.status === "empty")) {
        const multiplier = DCA_SIZE_MULTIPLIER[dcaIdx];
        const qty = (config.amountPerGrid * multiplier) / dcaPrice;
        const dcaLevel: GridLevel = {
          level: -1, buyPrice: dcaPrice, sellPrice: lowestBuy,
          quantity: qty, status: "empty", dcaLevel: dcaIdx + 1, sizeMultiplier: multiplier,
        };
        const profitPct = ((lowestBuy - dcaPrice) / dcaPrice) * 100;
        return {
          action: "buy", level: dcaLevel,
          reason: `📉 DCA ${multiplier}× @ ${dcaPrice.toFixed(2)} (kjøp under bunn, selg ved ${lowestBuy.toFixed(2)} = +${profitPct.toFixed(1)}%)`,
          expectedProfitPct: profitPct,
        };
      }
    }
    // Under grid, over DCA-nivåer, ingen sells → vent på DCA eller recovery
    const dcaBought = levels.filter(l => l.dcaLevel && l.status === "bought").length;
    return {
      action: "wait",
      reason: dcaBought >= DCA_LEVELS_PCT.length
        ? `Pris ${currentPrice.toFixed(2)} under grid — alle ${dcaBought} DCA-nivåer fylt`
        : `Pris ${currentPrice.toFixed(2)} under grid — venter på DCA-nivå (${(config.lowerPrice * DCA_LEVELS_PCT[0]).toFixed(0)}) eller retur over bunn`,
      expectedProfitPct: 0,
    };
  }

  // ═════════════════════════════════════════════════════════════════
  // PRIORITET 2 — OVER grid: vent. Sells er allerede håndtert over ↓
  // ═════════════════════════════════════════════════════════════════
  if (currentPrice > config.upperPrice) {
    return {
      action: "wait",
      reason: `Pris ${currentPrice.toFixed(2)} over grid ${config.upperPrice.toFixed(2)} — venter på retur`,
      expectedProfitPct: 0,
    };
  }

  const step = (config.upperPrice - config.lowerPrice) / config.gridLevels;
  const cellIndex = Math.min(config.gridLevels - 1, Math.floor((currentPrice - config.lowerPrice) / step));
  const cell = levels[cellIndex];

  // ═════════════════════════════════════════════════════════════════
  // PRIORITET 3 — BUY: pris er i grid — kjøp på høyeste empty nivå
  // under eller lik currentPrice. Dette er nivået prisen har falt TIL.
  // ═════════════════════════════════════════════════════════════════
  let bestBuy: { level: GridLevel; profitPct: number } | null = null;
  for (const l of levels) {
    if (l.status !== "empty") continue;
    if (l.buyPrice <= currentPrice) {
      const profitPct = ((l.sellPrice - l.buyPrice) / l.buyPrice) * 100;
      if (!bestBuy || l.buyPrice > bestBuy.level.buyPrice) {
        bestBuy = { level: l, profitPct };
      }
    }
  }

  if (bestBuy) {
    // 2026-08-03 (Toms krav): ALL kapital skal være investert til enhver tid.
    // I stedet for å kjøpe KUN det høyeste empty nivået per tick, returneres
    // nå ALLE empty nivåer under pris slik at tick kan fylle dem samlet.
    // Dette deployer hele kapitalen umiddelbart i stedet for å vente på at
    // prisen skal falle til hvert nivå sekvensielt.
    const allBuys = levels.filter(
      (l) => l.status === "empty" && l.buyPrice <= currentPrice,
    );
    return {
      action: "buy", level: bestBuy.level,
      reason: `Grid buy @ ${bestBuy.level.buyPrice.toFixed(2)} (nivå ${bestBuy.level.level}, target +${bestBuy.profitPct.toFixed(1)}%)`,
      expectedProfitPct: bestBuy.profitPct,
      allBuyLevels: allBuys.length > 1 ? allBuys : undefined,
    };
  }

  return {
    action: "wait",
    reason: `Pris ${currentPrice.toFixed(2)} i grid-celle ${cellIndex} — venter på nivå`,
    expectedProfitPct: 0,
  };
}

/**
 * Beregn optimale grid-parametere basert på volatilitet
 * 
 * Høy volatilitet → større intervall, flere nivåer
 * Lav volatilitet → mindre intervall, færre nivåer
 */
export function calculateOptimalGrid(
  currentPrice: number,
  volatility24h: number,  // 24h volatilitet i %
  totalCapital: number
): Omit<GridConfig, "symbol" | "currentPrice"> {
  // Grid-intervall: 2× daglig volatilitet (dekker 95% av prisbevegelse)
  const rangePct = Math.max(5, Math.min(20, volatility24h * 2));
  const lowerPrice = currentPrice * (1 - rangePct / 100);
  const upperPrice = currentPrice * (1 + rangePct / 100);
  
  // Antall nivåer: høyere volatilitet → flere nivåer
  const gridLevels = Math.max(5, Math.min(20, Math.round(volatility24h * 2)));
  
  // Beløp per grid: fordel kapital jevnt, maks 10% per nivå
  const maxPerGrid = totalCapital * 0.1;
  const amountPerGrid = Math.min(maxPerGrid, totalCapital / gridLevels);
  
  return {
    lowerPrice,
    upperPrice,
    gridLevels,
    amountPerGrid,
  };
}

/**
 * Grid trading forklaring for brukere (OSS)
 */
export const GRID_EXPLANATION = {
  no: "Grid trading kjøper automatisk når prisen faller og selger når den stiger — innenfor et forhåndsdefinert intervall. Du tjener på små svingninger uten å måtte gjette retningen. Perfekt for crypto som ofte går sidelengs.",
  en: "Grid trading automatically buys when price falls and sells when it rises — within a predefined range. You profit from small swings without guessing direction. Perfect for crypto that often moves sideways.",
};
