/**
 * Kanonisk fill-modell for Klarpakke trading.
 *
 * Beregner deterministisk utførelse gitt markedspris og ordreparametre.
 * Modusspesifikke parametere (gebyr-sats, slippage, minimumsordre)
 * settes av execution-adapteren; denne modellen er ren matematikk.
 */

export type QuoteCurrency = "USDT" | "NOK";

export interface FillModelParams {
  /** Ordreside */
  side: "buy" | "sell";
  /** Ønsket kvantum */
  quantity: number;
  /** Ordretype */
  orderType: "market" | "limit";
  /** Limit-pris (påkrevd for limit) */
  limitPrice?: number;
  /** Gjeldende markedspris */
  marketPrice: number;
  /** Gebyr-sats i desimal (f.eks. 0.001 = 0.1%) */
  feeRate: number;
  /** Slippage-sats i desimal for market orders (f.eks. 0.0005 = 0.05%) */
  marketSlippageRate: number;
  /** Minimum ordreverdi i quote-valuta */
  minOrderValue: number;
  /** Tilgjengelig kapital (for buy-ordre) */
  availableCapital?: number;
  /** Quote-valuta for priser og returnerte verdier */
  quoteCurrency: QuoteCurrency;
}

export interface FillModelResult {
  success: boolean;
  executedPrice: number;
  executedQuantity: number;
  fee: number;
  slippagePct: number;
  totalCost: number;
  quoteCurrency: QuoteCurrency;
  error?: string;
}

const VALID_CURRENCIES: readonly QuoteCurrency[] = ["USDT", "NOK"];

/**
 * Beregner fill basert på kanoniske regler.
 *
 * - Market order: fylles til markedspris justert for slippage.
 * - Limit order: fylles kun hvis limit-prisen er innenfor markedet
 *   (buy: limit >= market, sell: limit <= market).
 * - Gebyr beregnes av fylt verdi * feeRate.
 * - Buy-ordre avvises hvis total kostnad (verdi + gebyr) overstiger tilgjengelig kapital.
 * - Ordreverdi under minOrderValue avvises.
 */
export function computeFill(params: FillModelParams): FillModelResult {
  const {
    side,
    quantity,
    orderType,
    limitPrice,
    marketPrice,
    feeRate,
    marketSlippageRate,
    minOrderValue,
    availableCapital,
    quoteCurrency,
  } = params;

  if (!VALID_CURRENCIES.includes(quoteCurrency)) {
    return {
      success: false,
      executedPrice: 0,
      executedQuantity: 0,
      fee: 0,
      slippagePct: 0,
      totalCost: 0,
      quoteCurrency: quoteCurrency ?? "USDT",
      error: `Invalid or missing quote currency: ${String(quoteCurrency)}`,
    };
  }

  if (quantity <= 0 || !Number.isFinite(quantity)) {
    return {
      success: false,
      executedPrice: 0,
      executedQuantity: 0,
      fee: 0,
      slippagePct: 0,
      totalCost: 0,
      quoteCurrency,
      error: "Invalid quantity",
    };
  }

  if (marketPrice <= 0 || !Number.isFinite(marketPrice)) {
    return {
      success: false,
      executedPrice: 0,
      executedQuantity: 0,
      fee: 0,
      slippagePct: 0,
      totalCost: 0,
      quoteCurrency,
      error: "Invalid market price",
    };
  }

  let executedPrice = marketPrice;
  let slippagePct = 0;

  if (orderType === "limit") {
    if (limitPrice === undefined || limitPrice <= 0) {
      return {
        success: false,
        executedPrice: 0,
        executedQuantity: 0,
        fee: 0,
        slippagePct: 0,
        totalCost: 0,
        quoteCurrency,
        error: "Limit price required for limit order",
      };
    }

    // Buy limit: fylles hvis limit >= market (kan kjøpe lavere eller likt limit)
    // Sell limit: fylles hvis limit <= market (kan selge høyere eller likt limit)
    const fills =
      (side === "buy" && limitPrice >= marketPrice) ||
      (side === "sell" && limitPrice <= marketPrice);

    if (!fills) {
      return {
        success: false,
        executedPrice: 0,
        executedQuantity: 0,
        fee: 0,
        slippagePct: 0,
        totalCost: 0,
        quoteCurrency,
        error: "Limit price not reachable",
      };
    }

    executedPrice = limitPrice;
  } else {
    // Market order: slippage mot ugunstig retning
    slippagePct = marketSlippageRate * 100;
    const slippageFactor = side === "buy" ? 1 + marketSlippageRate : 1 - marketSlippageRate;
    executedPrice = marketPrice * slippageFactor;
  }

  const orderValue = quantity * executedPrice;

  if (orderValue < minOrderValue) {
    return {
      success: false,
      executedPrice: 0,
      executedQuantity: 0,
      fee: 0,
      slippagePct: 0,
      totalCost: 0,
      quoteCurrency,
      error: `Order value ${orderValue.toFixed(2)} below minimum ${minOrderValue.toFixed(2)}`,
    };
  }

  const fee = orderValue * feeRate;
  const totalCost = orderValue + fee;

  if (side === "buy" && availableCapital !== undefined && totalCost > availableCapital) {
    return {
      success: false,
      executedPrice: 0,
      executedQuantity: 0,
      fee: 0,
      slippagePct: 0,
      totalCost: 0,
      quoteCurrency,
      error: `Insufficient capital: required ${totalCost.toFixed(2)}, available ${availableCapital.toFixed(2)}`,
    };
  }

  return {
    success: true,
    executedPrice,
    executedQuantity: quantity,
    fee,
    slippagePct,
    totalCost,
    quoteCurrency,
  };
}
