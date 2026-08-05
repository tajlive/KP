/**
 * Kraken symbol-mapping
 * Kraken bruker andre symboler enn Binance
 */

export const KRAKEN_SYMBOL_MAP: Record<string, string> = {
  // Binance → Kraken
  BTCUSDT: "XBTUSDT",
  ETHUSDT: "ETHUSDT",
  SOLUSDT: "SOLUSDT",
  AVAXUSDT: "AVAXUSDT",
  DOGEUSDT: "DOGEUSDT",
  LINKUSDT: "LINKUSDT",
  ADAUSDT: "ADAUSDT",
  DOTUSDT: "DOTUSDT",
  POLUSDT: "POLUSDT",
  
  // Fiat
  USD: "ZUSD",
  EUR: "ZEUR",
};

export const KRAKEN_REVERSE_MAP: Record<string, string> = {
  XBTUSDT: "BTCUSDT",
  ETHUSDT: "ETHUSDT",
  SOLUSDT: "SOLUSDT",
  AVAXUSDT: "AVAXUSDT",
  DOGEUSDT: "DOGEUSDT",
  LINKUSDT: "LINKUSDT",
  ADAUSDT: "ADAUSDT",
  DOTUSDT: "DOTUSDT",
  POLUSDT: "POLUSDT",
  ZUSD: "USD",
  ZEUR: "EUR",
};

export function toKrakenSymbol(binanceSymbol: string): string {
  return KRAKEN_SYMBOL_MAP[binanceSymbol] || binanceSymbol;
}

export function fromKrakenSymbol(krakenSymbol: string): string {
  return KRAKEN_REVERSE_MAP[krakenSymbol] || krakenSymbol;
}

// Kraken-spesifikke konstanter
export const KRAKEN_MIN_ORDER = {
  XBTUSDT: "0.0001",
  ETHUSDT: "0.001",
  SOLUSDT: "0.01",
  AVAXUSDT: "0.1",
  DOGEUSDT: "10",
  LINKUSDT: "0.1",
  ADAUSDT: "1",
  DOTUSDT: "0.1",
  POLUSDT: "1",
};

export const KRAKEN_FEE = {
  MAKER: 0.0016, // 0.16%
  TAKER: 0.0026, // 0.26%
};
