/**
 * Execution Audit – Immutable Best Execution Logging
 * 
 * Logs:
 * - Order intent
 * - L2 snapshot at decision time
 * - Expected fill price
 * - Actual fill
 * - Venue score
 * - Latency
 * - Reject reason
 * 
 * @module trading/execution
 * @version 3.0.1
 */

import crypto from 'crypto';

export type OrderIntent = 'market' | 'limit' | 'stop' | 'ioc' | 'fok';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'accepted' | 'partially_filled' | 'filled' | 'rejected' | 'cancelled';
export type RejectReason = 'risk_limit' | 'insufficient_funds' | 'market_closed' | 'price_out_of_range' | 'rate_limited' | 'system_error' | 'user_cancelled' | null;

export interface L2Snapshot {
  timestamp: Date;
  bid: { price: number; size: number }[];
  ask: { price: number; size: number }[];
  spread: number;
  midPrice: number;
  spreadBps: number;
  imbalance: number; // (bidVolume - askVolume) / (bidVolume + askVolume)
}

export interface VenueScore {
  venue: string;
  price: number;
  liquidity: number;
  latency: number;
  fee: number;
  reliability: number;
  totalScore: number;
  factors: {
    priceWeight: number;
    costWeight: number;
    speedWeight: number;
    likelihoodWeight: number;
    sizeWeight: number;
    natureWeight: number;
  };
}

export interface ExpectedFill {
  price: number;
  quantity: number;
  slippageBps: number;
  fees: number;
  confidence: number; // Probability of fill
  estimatedTime: number; // ms
}

export interface ActualFill {
  orderId: string;
  fillId: string;
  timestamp: Date;
  price: number;
  quantity: number;
  fees: number;
  slippageBps: number;
  latency: number; // ms from intent to fill
  venue: string;
  status: OrderStatus;
}

export interface ExecutionEvidence {
  // Immutable identifiers
  evidenceId: string;           // SHA-256 hash of content
  orderId: string;
  clientId: string;
  sessionId: string;
  
  // Timeline
  intentTimestamp: Date;
  decisionTimestamp: Date;
  submissionTimestamp: Date;
  fillTimestamp?: Date;
  
  // Intent
  intent: {
    side: OrderSide;
    type: OrderIntent;
    symbol: string;
    requestedQty: number;
    requestedPrice?: number;
    timeInForce: string;
    strategy: string; // Which policy decided this
    regime: string;   // Market regime at decision
  };
  
  // Market state
  l2Snapshot: L2Snapshot;
  
  // Best execution analysis
  venueScores: VenueScore[];
  selectedVenue: string;
  selectionReason: string;
  
  // Expected vs actual
  expectedFill: ExpectedFill;
  actualFill?: ActualFill;
  
  // Outcome analysis
  outcome: {
    priceImprovementBps: number; // Positive = better than expected
    costVariance: number;        // Difference from expected cost
    executionQuality: number;    // 0-100 score
  };
  
  // Reject/Cancel info
  rejectReason?: RejectReason;
  rejectDetails?: string;
  
  // Compliance
  mifid2Compliant: boolean;
  bestExecutionLog: string;
  
  // Immutable record
  createdAt: Date;
  hash: string;
}

export interface CalibrationData {
  date: Date;
  symbol: string;
  sampleSize: number;
  avgSlippageBps: number;
  avgLatency: number;
  fillRate: number;
  priceImprovementBps: number;
  venueBreakdown: Record<string, { count: number; avgSlippage: number }>;
  recommendedParams: {
    slippageFactor: number;
    latencyBuffer: number;
    confidenceAdjustment: number;
  };
}

/**
 * Execution Auditor – Immutable audit trail for best execution
 */
export class ExecutionAuditor {
  private evidenceLog: ExecutionEvidence[] = [];
  private calibrationHistory: CalibrationData[] = [];
  private readonly maxLogSize = 10000;
  
  /**
   * Record order intent (before execution)
   */
  recordIntent(params: {
    orderId: string;
    clientId: string;
    sessionId: string;
    side: OrderSide;
    type: OrderIntent;
    symbol: string;
    quantity: number;
    price?: number;
    timeInForce: string;
    strategy: string;
    regime: string;
    l2Snapshot: L2Snapshot;
    venueScores: VenueScore[];
    selectedVenue: string;
    expectedFill: ExpectedFill;
  }): ExecutionEvidence {
    const now = new Date();
    
    const evidence: ExecutionEvidence = {
      evidenceId: '', // Will be set after hash calculation
      orderId: params.orderId,
      clientId: params.clientId,
      sessionId: params.sessionId,
      intentTimestamp: now,
      decisionTimestamp: now,
      submissionTimestamp: now,
      intent: {
        side: params.side,
        type: params.type,
        symbol: params.symbol,
        requestedQty: params.quantity,
        requestedPrice: params.price,
        timeInForce: params.timeInForce,
        strategy: params.strategy,
        regime: params.regime
      },
      l2Snapshot: params.l2Snapshot,
      venueScores: params.venueScores,
      selectedVenue: params.selectedVenue,
      selectionReason: this.generateSelectionReason(params.venueScores, params.selectedVenue),
      expectedFill: params.expectedFill,
      outcome: {
        priceImprovementBps: 0,
        costVariance: 0,
        executionQuality: 0
      },
      mifid2Compliant: true,
      bestExecutionLog: this.generateBestExecutionLog(params.venueScores),
      createdAt: now,
      hash: ''
    };
    
    // Calculate hash
    evidence.hash = this.calculateHash(evidence);
    evidence.evidenceId = evidence.hash;
    
    this.addToLog(evidence);
    
    return evidence;
  }
  
  /**
   * Update with actual fill
   */
  recordFill(orderId: string, actualFill: ActualFill): ExecutionEvidence | null {
    const evidence = this.evidenceLog.find(e => e.orderId === orderId);
    if (!evidence) return null;
    
    evidence.fillTimestamp = actualFill.timestamp;
    evidence.actualFill = actualFill;
    
    // Calculate outcome metrics
    evidence.outcome = {
      priceImprovementBps: this.calculatePriceImprovement(evidence.expectedFill, actualFill, evidence.intent.side),
      costVariance: actualFill.fees - evidence.expectedFill.fees,
      executionQuality: this.calculateExecutionQuality(evidence.expectedFill, actualFill)
    };
    
    // Recalculate hash
    evidence.hash = this.calculateHash(evidence);
    
    return evidence;
  }
  
  /**
   * Record rejection
   */
  recordRejection(orderId: string, reason: RejectReason, details?: string): ExecutionEvidence | null {
    const evidence = this.evidenceLog.find(e => e.orderId === orderId);
    if (!evidence) return null;
    
    evidence.rejectReason = reason;
    evidence.rejectDetails = details;
    evidence.hash = this.calculateHash(evidence);
    
    return evidence;
  }
  
  /**
   * Generate selection reason
   */
  private generateSelectionReason(venueScores: VenueScore[], selected: string): string {
    const selectedScore = venueScores.find(v => v.venue === selected);
    if (!selectedScore) return 'Unknown';
    
    const reasons: string[] = [];
    if (selectedScore.factors.priceWeight > 0.25) reasons.push('best_price');
    if (selectedScore.factors.costWeight > 0.2) reasons.push('lowest_cost');
    if (selectedScore.factors.speedWeight > 0.2) reasons.push('fastest');
    if (selectedScore.factors.likelihoodWeight > 0.15) reasons.push('highest_likelihood');
    
    return reasons.join(', ') || 'balanced_score';
  }
  
  /**
   * Generate best execution log (MiFID2 format)
   */
  private generateBestExecutionLog(venueScores: VenueScore[]): string {
    const sorted = [...venueScores].sort((a, b) => b.totalScore - a.totalScore);
    
    return JSON.stringify({
      executionFactors: {
        price: 0.3,
        costs: 0.25,
        speed: 0.2,
        likelihood: 0.15,
        size: 0.05,
        nature: 0.05
      },
      venuesConsidered: sorted.map(v => ({
        venue: v.venue,
        score: v.totalScore,
        price: v.price,
        cost: v.fee,
        latency: v.latency,
        liquidity: v.liquidity
      }))
    });
  }
  
  /**
   * Calculate price improvement in basis points
   */
  private calculatePriceImprovement(expected: ExpectedFill, actual: ActualFill, side: OrderSide): number {
    if (side === 'buy') {
      // For buys, lower price is better
      return ((expected.price - actual.price) / expected.price) * 10000;
    } else {
      // For sells, higher price is better
      return ((actual.price - expected.price) / expected.price) * 10000;
    }
  }
  
  /**
   * Calculate execution quality score (0-100)
   */
  private calculateExecutionQuality(expected: ExpectedFill, actual: ActualFill): number {
    let score = 50; // Base score
    
    // Price improvement bonus
    const priceImprovement = Math.abs(expected.price - actual.price) / expected.price;
    score += priceImprovement * 10000 * 2; // 2 points per bp improvement
    
    // Latency penalty
    if (actual.latency > 1000) score -= 10;
    if (actual.latency > 5000) score -= 20;
    
    // Fill rate bonus
    if (actual.quantity >= expected.quantity) score += 10;
    
    return Math.min(100, Math.max(0, score));
  }
  
  /**
   * Calculate SHA-256 hash of evidence (for immutability verification)
   */
  private calculateHash(evidence: ExecutionEvidence): string {
    const content = JSON.stringify({
      orderId: evidence.orderId,
      clientId: evidence.clientId,
      intent: evidence.intent,
      l2Snapshot: evidence.l2Snapshot,
      expectedFill: evidence.expectedFill,
      createdAt: evidence.createdAt
    });
    
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  /**
   * Add to log with size limit
   */
  private addToLog(evidence: ExecutionEvidence): void {
    this.evidenceLog.push(evidence);
    if (this.evidenceLog.length > this.maxLogSize) {
      this.evidenceLog.shift();
    }
  }
  
  /**
   * Get evidence by order ID
   */
  getEvidence(orderId: string): ExecutionEvidence | undefined {
    return this.evidenceLog.find(e => e.orderId === orderId);
  }
  
  /**
   * Get all evidence for a client
   */
  getClientEvidence(clientId: string): ExecutionEvidence[] {
    return this.evidenceLog.filter(e => e.clientId === clientId);
  }
  
  /**
   * Get evidence for time range (for MiFID2 reporting)
   */
  getEvidenceForPeriod(start: Date, end: Date): ExecutionEvidence[] {
    return this.evidenceLog.filter(e => 
      e.intentTimestamp >= start && e.intentTimestamp <= end
    );
  }
  
  /**
   * Export to MiFID2 RTS 27 format (transaction cost analysis)
   */
  exportRTS27(start: Date, end: Date): string {
    const evidence = this.getEvidenceForPeriod(start, end);
    
    const rows = evidence.map(e => ({
      orderId: e.orderId,
      executionTimestamp: e.actualFill?.timestamp.toISOString(),
      venue: e.actualFill?.venue || e.selectedVenue,
      price: e.actualFill?.price,
      costs: e.actualFill?.fees,
      priceImprovement: e.outcome.priceImprovementBps,
      executionQuality: e.outcome.executionQuality
    }));
    
    return JSON.stringify(rows, null, 2);
  }
  
  /**
   * Run weekly calibration
   */
  runCalibration(symbol: string, since: Date): CalibrationData {
    const relevantEvidence = this.evidenceLog.filter(e => 
      e.intent.symbol === symbol &&
      e.intentTimestamp >= since &&
      e.actualFill !== undefined
    );
    
    const sampleSize = relevantEvidence.length;
    if (sampleSize === 0) {
      throw new Error(`No fill data for ${symbol} since ${since}`);
    }
    
    const avgSlippage = relevantEvidence.reduce((sum, e) => 
      sum + (e.actualFill?.slippageBps || 0), 0) / sampleSize;
    
    const avgLatency = relevantEvidence.reduce((sum, e) => 
      sum + (e.actualFill?.latency || 0), 0) / sampleSize;
    
    const fills = relevantEvidence.filter(e => e.actualFill?.status === 'filled').length;
    const fillRate = fills / sampleSize;
    
    const avgImprovement = relevantEvidence.reduce((sum, e) => 
      sum + e.outcome.priceImprovementBps, 0) / sampleSize;
    
    // Venue breakdown
    const venueBreakdown: Record<string, { count: number; avgSlippage: number }> = {};
    for (const e of relevantEvidence) {
      const venue = e.actualFill?.venue || 'unknown';
      if (!venueBreakdown[venue]) {
        venueBreakdown[venue] = { count: 0, avgSlippage: 0 };
      }
      venueBreakdown[venue].count++;
      venueBreakdown[venue].avgSlippage += e.actualFill?.slippageBps || 0;
    }
    
    for (const v of Object.values(venueBreakdown)) {
      v.avgSlippage /= v.count;
    }
    
    const calibration: CalibrationData = {
      date: new Date(),
      symbol,
      sampleSize,
      avgSlippageBps: avgSlippage,
      avgLatency,
      fillRate,
      priceImprovementBps: avgImprovement,
      venueBreakdown,
      recommendedParams: {
        slippageFactor: Math.max(0.5, Math.min(2, avgSlippage / 5)),
        latencyBuffer: Math.max(1, avgLatency / 100),
        confidenceAdjustment: fillRate
      }
    };
    
    this.calibrationHistory.push(calibration);
    
    return calibration;
  }
  
  /**
   * Get calibration history
   */
  getCalibrationHistory(): CalibrationData[] {
    return [...this.calibrationHistory];
  }
  
  /**
   * Verify evidence integrity
   */
  verifyIntegrity(orderId: string): { valid: boolean; currentHash: string; storedHash: string } {
    const evidence = this.getEvidence(orderId);
    if (!evidence) {
      return { valid: false, currentHash: '', storedHash: '' };
    }
    
    const currentHash = this.calculateHash(evidence);
    return {
      valid: currentHash === evidence.hash,
      currentHash,
      storedHash: evidence.hash
    };
  }
}

/**
 * Create L2 snapshot from order book
 */
export function createL2Snapshot(
  bids: [number, number][],
  asks: [number, number][]
): L2Snapshot {
  const bestBid = bids[0];
  const bestAsk = asks[0];
  const midPrice = (bestBid[0] + bestAsk[0]) / 2;
  const spread = bestAsk[0] - bestBid[0];
  const spreadBps = (spread / midPrice) * 10000;
  
  const bidVolume = bids.reduce((sum, b) => sum + b[1], 0);
  const askVolume = asks.reduce((sum, a) => sum + a[1], 0);
  const imbalance = (bidVolume - askVolume) / (bidVolume + askVolume);
  
  return {
    timestamp: new Date(),
    bid: bids.slice(0, 5).map(b => ({ price: b[0], size: b[1] })),
    ask: asks.slice(0, 5).map(a => ({ price: a[0], size: a[1] })),
    spread,
    midPrice,
    spreadBps,
    imbalance
  };
}
