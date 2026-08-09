/**
 * Liquidation Guard — Beskytter mot liquidation ved leveraged trading
 * 
 * Overvåker margin ratio og liquidation-avstand.
 * Returnerer status: safe, warning, critical.
 * 
 * @module trading/safety
 * @version 1.0.0
 */

export interface LiquidationStatus {
  status: "safe" | "warning" | "critical";
  distance: number; // % avstand til liquidation
  liquidation_price: number;
  action: "none" | "reduce_position" | "close_position";
}

export class LiquidationGuard {
  private warningThreshold = 0.10; // 10% fra liquidation
  private criticalThreshold = 0.05; // 5% fra liquidation

  check(
    position: { liquidation_price?: number } | null | undefined,
    currentPrice: number,
    leverage: number
  ): LiquidationStatus {
    if (!position?.liquidation_price) {
      return {
        status: "safe",
        distance: 1,
        liquidation_price: 0,
        action: "none",
      };
    }

    const liqPrice = position.liquidation_price;
    const distance = Math.abs(currentPrice - liqPrice) / currentPrice;

    if (distance < this.criticalThreshold) {
      return {
        status: "critical",
        distance,
        liquidation_price: liqPrice,
        action: "close_position",
      };
    }

    if (distance < this.warningThreshold) {
      return {
        status: "warning",
        distance,
        liquidation_price: liqPrice,
        action: "reduce_position",
      };
    }

    return {
      status: "safe",
      distance,
      liquidation_price: liqPrice,
      action: "none",
    };
  }

  calculateLiquidationPrice(
    entryPrice: number,
    leverage: number,
    side: "long" | "short"
  ): number {
    // Maintenance margin: 0.5% for OKX
    const maintenanceMargin = 0.005;
    const marginRatio = 1 / leverage;
    
    if (side === "long") {
      // Long: liquidation når pris faller
      return entryPrice * (1 - marginRatio + maintenanceMargin);
    } else {
      // Short: liquidation når pris stiger
      return entryPrice * (1 + marginRatio - maintenanceMargin);
    }
  }
}
