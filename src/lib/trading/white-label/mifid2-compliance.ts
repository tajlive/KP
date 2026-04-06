/**
 * MiFID2 Compliance Layer
 * 
 * Implements:
 * - Best Execution (Art. 27)
 * - Transaction Reporting (Art. 26 / RTS 22)
 * - Order Record Keeping (Art. 25)
 * - Product Governance (Art. 16 & 24)
 * - Suitable Assessment (Art. 25)
 * 
 * @module trading/white-label/mifid2-compliance
 * @version 3.0.0
 */

export type ClientCategory = 'retail' | 'professional' | 'eligible_counterparty';
export type TradingCapacity = 'DEAL' | 'MTCH' | 'AOTC';
export type ProductSuitability = 'suitable' | 'not_suitable' | 'unsure';
export type OrderStatus = 'Created' | 'New' | 'PartiallyFilled' | 'Filled' | 'Cancelled' | 'Rejected';

export interface MiFID2OrderMetadata {
  /** Best execution venue selected */
  bestExecutionVenue: string;
  /** Execution quality score (0-100) */
  executionQualityScore: number;
  /** Client categorization */
  clientCategory: ClientCategory;
  /** Appropriateness test passed */
  appropriatenessTest: boolean;
  /** Product suitability assessment */
  productSuitability: ProductSuitability;
  /** Timestamp of suitability check */
  suitabilityCheckedAt: Date;
  /** Complex product flag */
  isComplexProduct: boolean;
  /** Leverage indicator */
  involvesLeverage: boolean;
  /** Associated person ID */
  associatedPersonId?: string;
  /** Waiver indicator */
  waiverIndicator?: string;
}

export interface TransactionReport {
  /** Unique transaction ID */
  transactionId: string;
  /** Trading venue transaction ID */
  tradingVenueTxId?: string;
  /** Executing entity identification code (LEI) */
  executingEntity: string;
  /** Trading capacity */
  tradingCapacity: TradingCapacity;
  /** Quantity */
  quantity: number;
  /** Unit price */
  price: number;
  /** Venue of execution */
  venue: string;
  /** Transaction timestamp (UTC) */
  transactionTime: string;
  /** Instrument identification (ISIN or LEI) */
  instrumentIdentification: string;
  /** Instrument full name */
  instrumentFullName: string;
  /** Instrument classification */
  instrumentClassification: string;
  /** Price notation */
  priceNotation: string;
  /** Notional amount */
  notionalAmount?: number;
  /** Notional currency */
  notionalCurrency?: string;
  /** Price multiplier */
  priceMultiplier?: number;
  /** Underlying instrument code */
  underlyingInstrumentCode?: string;
  /** Underlying index name */
  underlyingIndexName?: string;
  /** Nature of transaction */
  natureOfTransaction: 'OPEN' | 'CLOSE' | 'INCREASE' | 'DECREASE';
  /** Beneficiary ID */
  beneficiary?: string;
  /** Investment decision within firm */
  investmentDecision?: string;
  /** Investment decision timestamp */
  investmentDecisionTime?: string;
  /** Client identification */
  clientId: string;
  /** Country of branch membership */
  countryOfBranch?: string;
}

export interface BestExecutionReport {
  /** Order ID */
  orderId: string;
  /** Timestamp */
  timestamp: Date;
  /** Selected venue */
  selectedVenue: string;
  /** Available venues considered */
  venuesConsidered: Array<{
    venue: string;
    price: number;
    liquidity: number;
    latency: number;
    cost: number;
    score: number;
  }>;
  /** Execution factors considered */
  executionFactors: {
    price: number;
    costs: number;
    speed: number;
    likelihood: number;
    size: number;
    nature: number;
  };
  /** Total cost of execution */
  totalCost: number;
  /** Slippage achieved */
  slippageBps: number;
}

export interface SuitabilityAssessment {
  /** Client ID */
  clientId: string;
  /** Assessment date */
  assessedAt: Date;
  /** Client knowledge level */
  knowledgeLevel: 'basic' | 'informed' | 'expert';
  /** Client experience (years) */
  experience: number;
  /** Financial situation score */
  financialSituation: number;
  /** Investment objectives */
  investmentObjectives: string[];
  /** Risk tolerance */
  riskTolerance: 'low' | 'medium' | 'high';
  /** Ability to bear loss */
  abilityToBearLoss: number;
  /** Suitable products */
  suitableProducts: string[];
  /** Assessment result */
  result: ProductSuitability;
  /** Reasons if not suitable */
  notSuitableReasons?: string[];
  /** Appropriateness test for complex products */
  appropriatenessTest?: boolean;
}

export interface ProductGovernance {
  /** Product ID */
  productId: string;
  /** Target market assessment */
  targetMarket: {
    clientTypes: ClientCategory[];
    knowledgeRequired: 'basic' | 'informed' | 'expert';
    experienceRequired: number;
    riskProfile: 'low' | 'medium' | 'high';
  };
  /** Product risk level */
  productRiskLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** Complexity indicator */
  isComplex: boolean;
  /** Leverage factor */
  leverageFactor?: number;
  /** Cost structure */
  costStructure: {
    entryCost: number;
    exitCost: number;
    ongoingCost: number;
    performanceFee?: number;
  };
  /** Stress test results */
  stressTestResults?: {
    scenario: string;
    maxLoss: number;
    probability: number;
  }[];
}

// Execution factors weights for best execution
const EXECUTION_FACTOR_WEIGHTS = {
  price: 0.30,
  costs: 0.25,
  speed: 0.20,
  likelihood: 0.15,
  size: 0.05,
  nature: 0.05
};

/**
 * MiFID2 Compliance Manager
 */
export class MiFID2Compliance {
  private executingEntityLEI: string;
  private countryOfBranch: string;
  private transactionReports: TransactionReport[] = [];
  private bestExecutionReports: BestExecutionReport[] = [];
  private suitabilityAssessments: Map<string, SuitabilityAssessment> = new Map();
  private productGovernance: Map<string, ProductGovernance> = new Map();
  
  constructor(executingEntityLEI: string, countryOfBranch: string = 'NO') {
    this.executingEntityLEI = executingEntityLEI;
    this.countryOfBranch = countryOfBranch;
  }
  
  /**
   * Assess product suitability for client
   */
  assessSuitability(
    clientId: string,
    productId: string,
    clientAssessment: SuitabilityAssessment
  ): ProductSuitability {
    const product = this.productGovernance.get(productId);
    
    if (!product) {
      return 'unsure';
    }
    
    // Store assessment
    this.suitabilityAssessments.set(clientId, clientAssessment);
    
    // Check knowledge level
    if (clientAssessment.knowledgeLevel === 'basic' && product.targetMarket.knowledgeRequired !== 'basic') {
      return 'not_suitable';
    }
    
    // Check experience
    if (clientAssessment.experience < product.targetMarket.experienceRequired) {
      return 'not_suitable';
    }
    
    // Check risk tolerance
    const riskMap = { low: 1, medium: 3, high: 5 };
    if (riskMap[clientAssessment.riskTolerance] < product.productRiskLevel) {
      return 'not_suitable';
    }
    
    // Check ability to bear loss
    if (clientAssessment.abilityToBearLoss < (product.stressTestResults?.[0]?.maxLoss || 0.1)) {
      return 'not_suitable';
    }
    
    return 'suitable';
  }
  
  /**
   * Determine best execution venue
   */
  determineBestExecution(
    orderId: string,
    symbol: string,
    side: 'Buy' | 'Sell',
    quantity: number,
    venues: Array<{
      name: string;
      price: number;
      liquidity: number;
      fee: number;
      latency: number;
    }>
  ): BestExecutionReport {
    const scoredVenues = venues.map(venue => {
      // Calculate execution factors
      const priceScore = side === 'Buy' 
        ? (1 - (venue.price - Math.min(...venues.map(v => v.price))) / venue.price) * 100
        : (1 - (Math.max(...venues.map(v => v.price)) - venue.price) / venue.price) * 100;
      
      const costScore = (1 - venue.fee / Math.max(...venues.map(v => v.fee))) * 100;
      const speedScore = (1 - venue.latency / Math.max(...venues.map(v => v.latency))) * 100;
      const likelihoodScore = Math.min(100, venue.liquidity / quantity * 100);
      const sizeScore = Math.min(100, venue.liquidity / quantity * 50);
      const natureScore = 50; // Neutral for crypto
      
      // Weighted total score
      const totalScore = 
        priceScore * EXECUTION_FACTOR_WEIGHTS.price +
        costScore * EXECUTION_FACTOR_WEIGHTS.costs +
        speedScore * EXECUTION_FACTOR_WEIGHTS.speed +
        likelihoodScore * EXECUTION_FACTOR_WEIGHTS.likelihood +
        sizeScore * EXECUTION_FACTOR_WEIGHTS.size +
        natureScore * EXECUTION_FACTOR_WEIGHTS.nature;
      
      return {
        venue: venue.name,
        price: venue.price,
        liquidity: venue.liquidity,
        latency: venue.latency,
        cost: venue.fee,
        score: totalScore
      };
    });
    
    // Sort by score
    scoredVenues.sort((a, b) => b.score - a.score);
    
    const selectedVenue = scoredVenues[0];
    const slippage = side === 'Buy' 
      ? (selectedVenue.price - scoredVenues[scoredVenues.length - 1].price) / selectedVenue.price * 10000
      : (scoredVenues[scoredVenues.length - 1].price - selectedVenue.price) / selectedVenue.price * 10000;
    
    const report: BestExecutionReport = {
      orderId,
      timestamp: new Date(),
      selectedVenue: selectedVenue.venue,
      venuesConsidered: scoredVenues,
      executionFactors: {
        price: EXECUTION_FACTOR_WEIGHTS.price,
        costs: EXECUTION_FACTOR_WEIGHTS.costs,
        speed: EXECUTION_FACTOR_WEIGHTS.speed,
        likelihood: EXECUTION_FACTOR_WEIGHTS.likelihood,
        size: EXECUTION_FACTOR_WEIGHTS.size,
        nature: EXECUTION_FACTOR_WEIGHTS.nature
      },
      totalCost: selectedVenue.cost,
      slippageBps: slippage
    };
    
    this.bestExecutionReports.push(report);
    return report;
  }
  
  /**
   * Generate MiFID2 order metadata
   */
  generateOrderMetadata(
    orderId: string,
    clientId: string,
    productId: string,
    clientCategory: ClientCategory
  ): MiFID2OrderMetadata {
    const suitability = this.suitabilityAssessments.get(clientId);
    const product = this.productGovernance.get(productId);
    
    // Determine best execution venue
    const venues = [
      { name: 'Bybit', price: 100, liquidity: 1000000, fee: 0.00055, latency: 50 },
      { name: 'Binance', price: 100.1, liquidity: 2000000, fee: 0.0005, latency: 60 },
      { name: 'Coinbase', price: 100.2, liquidity: 500000, fee: 0.006, latency: 100 }
    ];
    
    const bestExecution = this.determineBestExecution(orderId, 'BTC-USD', 'Buy', 1, venues);
    
    return {
      bestExecutionVenue: bestExecution.selectedVenue,
      executionQualityScore: bestExecution.venuesConsidered[0]?.score || 0,
      clientCategory,
      appropriatenessTest: suitability?.result === 'suitable' || false,
      productSuitability: suitability?.result || 'unsure',
      suitabilityCheckedAt: suitability?.assessedAt || new Date(),
      isComplexProduct: product?.isComplex || false,
      involvesLeverage: !!product?.leverageFactor
    };
  }
  
  /**
   * Generate RTS 22 transaction report
   */
  generateTransactionReport(
    orderId: string,
    clientId: string,
    symbol: string,
    side: 'Buy' | 'Sell',
    quantity: number,
    price: number,
    venue: string,
    instrumentISIN: string,
    natureOfTransaction: TransactionReport['natureOfTransaction']
  ): TransactionReport {
    const report: TransactionReport = {
      transactionId: `TXN-${Date.now()}-${orderId}`,
      executingEntity: this.executingEntityLEI,
      tradingCapacity: 'AOTC', // Acting on own account (for market maker) or 'DEAL'
      quantity,
      price,
      venue,
      transactionTime: new Date().toISOString(),
      instrumentIdentification: instrumentISIN,
      instrumentFullName: symbol,
      instrumentClassification: 'CRYPTO', // EMIR classification
      priceNotation: 'MONE',
      notionalAmount: quantity * price,
      notionalCurrency: 'USD',
      natureOfTransaction,
      clientId,
      countryOfBranch: this.countryOfBranch
    };
    
    this.transactionReports.push(report);
    return report;
  }
  
  /**
   * Register product governance
   */
  registerProduct(governance: ProductGovernance): void {
    this.productGovernance.set(governance.productId, governance);
  }
  
  /**
   * Get all transaction reports for a period
   */
  getTransactionReports(
    startDate: Date,
    endDate: Date,
    clientId?: string
  ): TransactionReport[] {
    return this.transactionReports.filter(r => {
      const reportDate = new Date(r.transactionTime);
      const inRange = reportDate >= startDate && reportDate <= endDate;
      const clientMatch = clientId ? r.clientId === clientId : true;
      return inRange && clientMatch;
    });
  }
  
  /**
   * Export transaction reports in RTS 22 format (XML)
   */
  exportRTS22(reports: TransactionReport[]): string {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
    const txReports = reports.map(r => `
  <Tx>
    <TxId>${r.transactionId}</TxId>
    <ExctgPty>${r.executingEntity}</ExctgPty>
    <TxQty>${r.quantity}</TxQty>
    <UnitPric>${r.price}</UnitPric>
    <TradgPty>${r.venue}</TradgPty>
    <TradDt>${r.transactionTime.split('T')[0]}</TradDt>
    <TxTm>${r.transactionTime}</TxTm>
    <FinInstrm>${r.instrumentIdentification}</FinInstrm>
    <NtrOfTx>${r.natureOfTransaction}</NtrOfTx>
    <CtryOfBrnch>${r.countryOfBranch}</CtryOfBrnch>
  </Tx>`).join('');
    
    return `${xmlHeader}
<TxRpts>${txReports}
</TxRpts>`;
  }
  
  /**
   * Validate order against MiFID2 requirements
   */
  validateOrder(
    clientId: string,
    productId: string,
    clientCategory: ClientCategory
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check suitability assessment exists
    const suitability = this.suitabilityAssessments.get(clientId);
    if (!suitability) {
      errors.push('No suitability assessment on file');
    }
    
    // Check product governance exists
    const product = this.productGovernance.get(productId);
    if (!product) {
      errors.push('Product not registered in governance framework');
    }
    
    // Check appropriateness for retail clients
    if (clientCategory === 'retail') {
      if (!suitability || suitability.result !== 'suitable') {
        errors.push('Product not suitable for retail client');
      }
      
      if (product?.isComplex && !suitability?.appropriatenessTest) {
        errors.push('Complex product requires appropriateness test');
      }
    }
    
    // Check leverage limits for retail
    if (clientCategory === 'retail' && (product?.leverageFactor || 1) > 2) {
      errors.push('Leverage exceeds retail limit');
    }
    
    return { valid: errors.length === 0, errors };
  }
}

/**
 * AUM Fee Calculator for white-label partners
 */
export interface AUMFeeTier {
  minAUM: number;
  maxAUM: number;
  managementFee: number;    // Annual %
  performanceFee: number;   // Annual % of profits
  platformFee: number;      // Fixed monthly (USD)
  minFee?: number;          // Minimum annual fee
}

export interface FeeCalculation {
  aum: number;
  performance: number;
  managementFee: number;
  performanceFee: number;
  platformFee: number;
  totalFee: number;
  effectiveRate: number;
}

export const DEFAULT_FEE_TIERS: AUMFeeTier[] = [
  { minAUM: 0, maxAUM: 100000, managementFee: 0.015, performanceFee: 0.10, platformFee: 199, minFee: 500 },
  { minAUM: 100000, maxAUM: 500000, managementFee: 0.012, performanceFee: 0.15, platformFee: 499, minFee: 1500 },
  { minAUM: 500000, maxAUM: 1000000, managementFee: 0.010, performanceFee: 0.20, platformFee: 999, minFee: 3000 },
  { minAUM: 1000000, maxAUM: 5000000, managementFee: 0.008, performanceFee: 0.20, platformFee: 1999, minFee: 5000 },
  { minAUM: 5000000, maxAUM: Infinity, managementFee: 0.006, performanceFee: 0.25, platformFee: 4999, minFee: 10000 }
];

/**
 * Calculate AUM-based fees
 */
export function calculateAUMFees(
  aum: number,
  annualPerformance: number,
  tiers: AUMFeeTier[] = DEFAULT_FEE_TIERS
): FeeCalculation {
  // Find applicable tier
  const tier = tiers.find(t => aum >= t.minAUM && aum < t.maxAUM) || tiers[tiers.length - 1];
  
  // Calculate management fee
  const managementFee = Math.max(
    tier.minFee || 0,
    aum * tier.managementFee
  );
  
  // Calculate performance fee (only on positive performance)
  const performanceFee = annualPerformance > 0 
    ? annualPerformance * tier.performanceFee 
    : 0;
  
  // Platform fee (monthly * 12)
  const platformFee = tier.platformFee * 12;
  
  // Total fee
  const totalFee = managementFee + performanceFee + platformFee;
  
  // Effective rate
  const effectiveRate = totalFee / aum;
  
  return {
    aum,
    performance: annualPerformance,
    managementFee,
    performanceFee,
    platformFee,
    totalFee,
    effectiveRate
  };
}

/**
 * High water mark calculator for performance fees
 */
export class HighWaterMarkCalculator {
  private highWaterMarks: Map<string, number> = new Map();
  
  /**
   * Update high water mark for client
   */
  updateHighWaterMark(clientId: string, currentValue: number): number {
    const currentHWM = this.highWaterMarks.get(clientId) || 0;
    const newHWM = Math.max(currentHWM, currentValue);
    this.highWaterMarks.set(clientId, newHWM);
    return newHWM;
  }
  
  /**
   * Calculate performance fee with high water mark
   */
  calculatePerformanceFee(
    clientId: string,
    currentValue: number,
    performanceFeeRate: number
  ): { fee: number; newHighWaterMark: number } {
    const hwm = this.highWaterMarks.get(clientId) || currentValue;
    const profitAboveHWM = Math.max(0, currentValue - hwm);
    const fee = profitAboveHWM * performanceFeeRate;
    const newHWM = this.updateHighWaterMark(clientId, currentValue);
    
    return { fee, newHighWaterMark: newHWM };
  }
}
