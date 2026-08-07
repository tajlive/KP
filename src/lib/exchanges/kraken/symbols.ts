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
  DOGEUSDT: "XDGUSDT",
  LINKUSDT: "LINKUSDT",
  ADAUSDT: "ADAUSDT",
  DOTUSDT: "DOTUSDT",

  // Grid-par (USDC): BTCUSDC er gammel konvensjon — Kraken bruker XBTUSDC
  BTCUSDC: "XBTUSDC",
  ETHUSDC: "ETHUSDC",
  SOLUSDC: "SOLUSDC",

  // Fiat
  USD: "ZUSD",
  EUR: "ZEUR",
};

export const KRAKEN_REVERSE_MAP: Record<string, string> = {
  XBTUSDT: "BTCUSDT",
  ETHUSDT: "ETHUSDT",
  SOLUSDT: "SOLUSDT",
  AVAXUSDT: "AVAXUSDT",
  XDGUSDT: "DOGEUSDT",
  LINKUSDT: "LINKUSDT",
  ADAUSDT: "ADAUSDT",
  DOTUSDT: "DOTUSDT",
  POLUSD: "POLUSDT",
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
export const KRAKEN_MIN_ORDER: Record<string, string> = {
  XBTUSDT: "0.00005",
  ETHUSDT: "0.001",
  SOLUSDT: "0.06",
  AVAXUSDT: "0.5",
  XDGUSDT: "50",
  LINKUSDT: "0.55",
  ADAUSDT: "20",
  DOTUSDT: "3.9",
  POLUSD: "70",
  USDTUSD: "5",
  USDTEUR: "5",
};

export function krakenMinOrder(pair: string): string {
  return KRAKEN_MIN_ORDER[pair] ?? "0.0001";
}

export const KRAKEN_FEE = {
  MAKER: 0.0016, // 0.16%
  TAKER: 0.0026, // 0.26%
};
