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
}

export interface GridSignal {
  action: "buy" | "sell" | "wait";
  level?: GridLevel;
  reason: string;
  expectedProfitPct: number;
}

/** DCA under bunn: 3 nivåer under laveste grid, progressivt større beløp */
const DCA_LEVELS_PCT = [0.95, 0.90, 0.85]; // 95%, 90%, 85% av lowerPrice
const DCA_SIZE_MULTIPLIER = [1.0, 1.5, 2.0]; // 1×, 1.5×, 2× normal grid-størrelse

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
  // Utenfor grid UNDER → DCA: kjøp på fallende pris (aldri stopp kjøp)
  if (currentPrice < config.lowerPrice) {
    const lowestBuy = levels[0].buyPrice;
    for (let dcaIdx = 0; dcaIdx < DCA_LEVELS_PCT.length; dcaIdx++) {
      const dcaPrice = config.lowerPrice * DCA_LEVELS_PCT[dcaIdx];
      // Sjekk om vi har en lagret DCA-kjøpsordre for dette nivået
      const existingDca = levels.find(l => l.dcaLevel === dcaIdx + 1);
      if (currentPrice <= dcaPrice && (!existingDca || existingDca.status === "empty")) {
        const multiplier = DCA_SIZE_MULTIPLIER[dcaIdx];
        const qty = (config.amountPerGrid * multiplier) / dcaPrice;
        const dcaLevel: GridLevel = {
          level: -1,
          buyPrice: dcaPrice,
          sellPrice: lowestBuy, // selg tilbake ved laveste grid-nivå
          quantity: qty,
          status: "empty",
          dcaLevel: dcaIdx + 1,
        };
        const profitPct = ((lowestBuy - dcaPrice) / dcaPrice) * 100;
        return {
          action: "buy",
          level: dcaLevel,
          reason: `📉 DCA ${multiplier}× @ ${dcaPrice.toFixed(2)} (kjøp under bunn, selg ved ${lowestBuy.toFixed(2)} = +${profitPct.toFixed(1)}%)`,
          expectedProfitPct: profitPct,
        };
      }
    }
    return {
      action: "wait",
      reason: `Pris ${currentPrice.toFixed(2)} under grid — alle DCA-nivåer fylt`,
      expectedProfitPct: 0,
    };
  }
  
  // Utenfor grid OVER → vent (grid tjener ikke på trend opp)
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
  
  // 🎯 SELL FIRST: sjekk både gjeldende celle og cellen under
  // (fordi kjøp skjer når pris faller til cellens buyPrice, 
  //  men salg skjer når pris stiger TILBAKE til cellens sellPrice)
  for (const checkCell of [cell, levels[cellIndex - 1]]) {
    if (checkCell && checkCell.status === "bought" && currentPrice >= checkCell.sellPrice) {
      const profitPct = ((checkCell.sellPrice - checkCell.buyPrice) / checkCell.buyPrice) * 100;
      return {
        action: "sell",
        level: checkCell,
        reason: `Grid sell @ ${checkCell.sellPrice.toFixed(2)} (nivå ${checkCell.level}, +${profitPct.toFixed(1)}%)`,
        expectedProfitPct: profitPct,
      };
    }
  }
  
  // 🎯 BUY: hvis nivået er tomt og pris ≤ buyPrice (pris har falt til kjøpsnivå)
  if (cell.status === "empty" && currentPrice <= cell.buyPrice) {
    const profitPct = ((cell.sellPrice - cell.buyPrice) / cell.buyPrice) * 100;
    return {
      action: "buy",
      level: cell,
      reason: `Grid buy @ ${cell.buyPrice.toFixed(2)} (nivå ${cell.level}, target +${profitPct.toFixed(1)}%)`,
      expectedProfitPct: profitPct,
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
