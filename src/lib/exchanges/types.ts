export type SupportedExchange = "kraken";

export type ExchangePermission =
  | "balances"
  | "trade_history"
  | "open_orders"
  | "trading";

export interface ExchangeConnectionInput {
  exchange: SupportedExchange;
  apiKey: string;
  apiSecret: string;
  isTestnet?: boolean;
  permissions: ExchangePermission[];
}

export interface ExchangeConnectionView {
  id: string;
  exchange: SupportedExchange;
  isActive: boolean;
  isTestnet: boolean;
  permissions: ExchangePermission[];
  createdAt: string | null;
  lastValidatedAt: string | null;
  lastError: string | null;
}

export interface NormalizedWalletBalance {
  currency: string;
  balance: number;
}

export interface NormalizedTrade {
  externalId: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  timestamp: string;
}
