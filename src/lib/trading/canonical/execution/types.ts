/**
 * Kanonisk execution-adapter interface for Klarpakke trading.
 *
 * Mål: strategier og ruter skal kunne kalle samme interface uavhengig av
 * modus (paper/live). Modusspesifikke forskjeller (gebyrer, slippage,
 * fills, broker-avvisninger) isoleres i adapter-implementasjonene.
 */

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBookSnapshot {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: Date;
}

export interface ExecutionRequest {
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  orderType: "market" | "limit";
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface ExecutionResult {
  success: boolean;
  orderId: string;
  executedPrice: number;
  executedQuantity: number;
  fee: number;
  timestamp: Date;
  error?: string;
  slippagePct?: number;
  /** Broker-spesifikke detaljer (f.eks. fill-array fra Kraken) */
  brokerDetails?: Record<string, unknown>;
}

export interface BalanceInfo {
  available: number;
  locked?: number;
  total?: number;
}

export interface PositionInfo {
  symbol: string;
  quantity: number;
  entryPrice: number;
  entryTime: Date;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
}

/**
 * Kanonisk execution-adapter.
 *
 * Implementeres av:
 * - PaperExecutionAdapter: simulert utførelse mot kanonisk markedsdata
 * - KrakenExecutionAdapter: ekte ordreutførelse mot Kraken
 */
export interface ExecutionAdapter {
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
  getBalance(): Promise<BalanceInfo>;
  getPosition(symbol: string): Promise<PositionInfo | null>;
  validateConnection(): Promise<boolean>;
  getMarketPrice(symbol: string): Promise<number>;
  fetchOrderBook(symbol: string, limit?: number): Promise<OrderBookSnapshot>;
}
