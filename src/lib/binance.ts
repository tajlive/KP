// Binance API Integration
const BINANCE_API_BASE = 'https://api.binance.com';
const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/ws';

// Top 20 coins for trading
export const TOP_COINS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', baseAsset: 'BTC' },
  { symbol: 'ETHUSDT', name: 'Ethereum', baseAsset: 'ETH' },
  { symbol: 'BNBUSDT', name: 'BNB', baseAsset: 'BNB' },
  { symbol: 'SOLUSDT', name: 'Solana', baseAsset: 'SOL' },
  { symbol: 'XRPUSDT', name: 'XRP', baseAsset: 'XRP' },
  { symbol: 'ADAUSDT', name: 'Cardano', baseAsset: 'ADA' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', baseAsset: 'DOGE' },
  { symbol: 'DOTUSDT', name: 'Polkadot', baseAsset: 'DOT' },
  { symbol: 'MATICUSDT', name: 'Polygon', baseAsset: 'MATIC' },
  { symbol: 'AVAXUSDT', name: 'Avalanche', baseAsset: 'AVAX' },
  { symbol: 'LINKUSDT', name: 'Chainlink', baseAsset: 'LINK' },
  { symbol: 'LTCUSDT', name: 'Litecoin', baseAsset: 'LTC' },
  { symbol: 'UNIUSDT', name: 'Uniswap', baseAsset: 'UNI' },
  { symbol: 'ATOMUSDT', name: 'Cosmos', baseAsset: 'ATOM' },
  { symbol: 'ETCUSDT', name: 'Ethereum Classic', baseAsset: 'ETC' },
  { symbol: 'XLMUSDT', name: 'Stellar', baseAsset: 'XLM' },
  { symbol: 'ALGOUSDT', name: 'Algorand', baseAsset: 'ALGO' },
  { symbol: 'VETUSDT', name: 'VeChain', baseAsset: 'VET' },
  { symbol: 'FILUSDT', name: 'Filecoin', baseAsset: 'FIL' },
  { symbol: 'TRXUSDT', name: 'TRON', baseAsset: 'TRX' },
];

// REST API response types
interface Ticker24hResponse {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  lastPrice: string;
  lastQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

interface TickerPriceResponse {
  symbol: string;
  price: string;
}

interface KlineResponse {
  0: number;    // Open time
  1: string;    // Open
  2: string;    // High
  3: string;    // Low
  4: string;    // Close
  5: string;    // Volume
  6: number;    // Close time
  7: string;    // Quote volume
  8: number;    // Number of trades
  9: string;    // Taker buy base volume
  10: string;   // Taker buy quote volume
  11: string;   // Ignore
}

interface ExchangeInfoResponse {
  timezone: string;
  serverTime: number;
  rateLimits: unknown[];
  exchangeFilters: unknown[];
  symbols: unknown[];
}

interface OrderBookResponse {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
}

interface TradeResponse {
  id: number;
  price: string;
  qty: string;
  quoteQty: string;
  time: number;
  isBuyerMaker: boolean;
  isBestMatch: boolean;
}

// REST API Functions
export const getTicker24h = async (symbol?: string): Promise<Ticker24hResponse | Ticker24hResponse[]> => {
  const url = symbol 
    ? `${BINANCE_API_BASE}/api/v3/ticker/24hr?symbol=${symbol}`
    : `${BINANCE_API_BASE}/api/v3/ticker/24hr`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch ticker data');
  return response.json();
};

export const getTickerPrice = async (symbol?: string): Promise<TickerPriceResponse | TickerPriceResponse[]> => {
  const url = symbol
    ? `${BINANCE_API_BASE}/api/v3/ticker/price?symbol=${symbol}`
    : `${BINANCE_API_BASE}/api/v3/ticker/price`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch price');
  return response.json();
};

/**
 * Batch price fetch — optimal for multiple symbols in one call
 * Uses Binance's symbols parameter to reduce N requests to 1
 */
export const getTickerPrices = async (symbols: string[]): Promise<TickerPriceResponse[]> => {
  if (symbols.length === 0) return [];
  if (symbols.length === 1) {
    const result = await getTickerPrice(symbols[0]);
    return Array.isArray(result) ? result : [result];
  }
  const encoded = encodeURIComponent(JSON.stringify(symbols));
  const url = `${BINANCE_API_BASE}/api/v3/ticker/price?symbols=${encoded}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch batch prices');
  return response.json();
};

export const getKlines = async (
  symbol: string,
  interval: string = '1h',
  limit: number = 100
): Promise<KlineResponse[]> => {
  const url = `${BINANCE_API_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch klines');
  return response.json();
};

export const getExchangeInfo = async (): Promise<ExchangeInfoResponse> => {
  const response = await fetch(`${BINANCE_API_BASE}/api/v3/exchangeInfo`);
  if (!response.ok) throw new Error('Failed to fetch exchange info');
  return response.json();
};

export const getOrderBook = async (symbol: string, limit: number = 100): Promise<OrderBookResponse> => {
  const url = `${BINANCE_API_BASE}/api/v3/depth?symbol=${symbol}&limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch order book');
  return response.json();
};

export const getRecentTrades = async (symbol: string, limit: number = 100): Promise<TradeResponse[]> => {
  const url = `${BINANCE_API_BASE}/api/v3/trades?symbol=${symbol}&limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch recent trades');
  return response.json();
};

// WebSocket message types
interface WSStreamData {
  stream?: string;
  data?: WSMessage;
}

interface WSMessage {
  e?: string;           // Event type
  E?: number;           // Event time
  s?: string;           // Symbol
  p?: string;           // Price change
  P?: string;           // Price change percent
  w?: string;           // Weighted average price
  c?: string;           // Last price
  Q?: string;           // Last quantity
  o?: string;           // Open price
  h?: string;           // High price
  l?: string;           // Low price
  v?: string;           // Volume
  q?: string;           // Quote volume
  O?: number;           // Open time
  C?: number;           // Close time
  F?: number;           // First trade ID
  L?: number;           // Last trade ID
  n?: number;           // Number of trades
}

type WebSocketCallback = (data: WSMessage) => void;

// WebSocket Management
class BinanceWebSocket {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Set<WebSocketCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscribedStreams: Set<string> = new Set();

  connect(streams: string[]) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Already connected, just update streams if needed
      return;
    }

    const streamParam = streams.length === 1 ? streams[0] : streams.join('/');
    const url = streams.length === 1 
      ? `${BINANCE_WS_BASE}/${streamParam}`
      : `${BINANCE_WS_BASE}/stream?streams=${streamParam}`;

    this.ws = new WebSocket(url);
    this.subscribedStreams = new Set(streams);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const data: WSStreamData = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      this.attemptReconnect(streams);
    };
  }

  private handleMessage(data: WSStreamData) {
    // Handle combined stream format
    const message = (data.data || data) as WSMessage;
    const stream = data.stream || message?.s;
    
    if (stream && message) {
      const callbacks = this.subscribers.get(stream);
      if (callbacks) {
        callbacks.forEach((cb) => cb(message));
      }
    }
  }

  private attemptReconnect(streams: string[]) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect(streams);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  subscribe(stream: string, callback: WebSocketCallback) {
    if (!this.subscribers.has(stream)) {
      this.subscribers.set(stream, new Set());
    }
    this.subscribers.get(stream)!.add(callback);
  }

  unsubscribe(stream: string, callback: WebSocketCallback) {
    const callbacks = this.subscribers.get(stream);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscribers.delete(stream);
      }
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.subscribedStreams.clear();
  }

  // Subscribe to ticker updates for multiple symbols
  subscribeToTickers(symbols: string[], callback: WebSocketCallback) {
    const streams = symbols.map((s) => `${s.toLowerCase()}@ticker`);
    this.connect(streams);
    streams.forEach((stream) => this.subscribe(stream, callback));
    return () => streams.forEach((stream) => this.unsubscribe(stream, callback));
  }

  // Subscribe to trade updates
  subscribeToTrades(symbol: string, callback: WebSocketCallback) {
    const stream = `${symbol.toLowerCase()}@trade`;
    this.connect([stream]);
    this.subscribe(stream, callback);
    return () => this.unsubscribe(stream, callback);
  }

  // Subscribe to kline/candlestick updates
  subscribeToKlines(symbol: string, interval: string, callback: WebSocketCallback) {
    const stream = `${symbol.toLowerCase()}@kline_${interval}`;
    this.connect([stream]);
    this.subscribe(stream, callback);
    return () => this.unsubscribe(stream, callback);
  }

  // Subscribe to mini ticker (lighter weight)
  subscribeToMiniTickers(symbols: string[], callback: WebSocketCallback) {
    const streams = symbols.map((s) => `${s.toLowerCase()}@miniTicker`);
    this.connect(streams);
    streams.forEach((stream) => this.subscribe(stream, callback));
    return () => streams.forEach((stream) => this.unsubscribe(stream, callback));
  }
}

// Export singleton instance
export const binanceWS = new BinanceWebSocket();

// Helper to format price with appropriate decimals
export const formatPrice = (price: number): string => {
  if (price >= 10000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  } else if (price >= 0.01) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  } else {
    return price.toLocaleString('en-US', { minimumFractionDigits: 8, maximumFractionDigits: 8 });
  }
};

// Helper to format large numbers (volume, market cap)
export const formatLargeNumber = (num: number): string => {
  if (num >= 1e12) {
    return (num / 1e12).toFixed(2) + 'T';
  } else if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + 'B';
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + 'M';
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(2) + 'K';
  }
  return num.toFixed(2);
};

// Calculate price change color
export const getPriceChangeColor = (change: number): string => {
  if (change > 0) return 'text-emerald-400';
  if (change < 0) return 'text-red-400';
  return 'text-gray-400';
};

// Parse WebSocket ticker data
export interface TickerData {
  symbol: string;
  priceChange: number;
  priceChangePercent: number;
  weightedAvgPrice: number;
  lastPrice: number;
  lastQty: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

export const parseTickerData = (data: WSMessage): TickerData => ({
  symbol: data.s || '',
  priceChange: parseFloat(data.p || '0'),
  priceChangePercent: parseFloat(data.P || '0'),
  weightedAvgPrice: parseFloat(data.w || '0'),
  lastPrice: parseFloat(data.c || '0'),
  lastQty: parseFloat(data.Q || '0'),
  openPrice: parseFloat(data.o || '0'),
  highPrice: parseFloat(data.h || '0'),
  lowPrice: parseFloat(data.l || '0'),
  volume: parseFloat(data.v || '0'),
  quoteVolume: parseFloat(data.q || '0'),
  openTime: data.O || 0,
  closeTime: data.C || 0,
  firstId: data.F || 0,
  lastId: data.L || 0,
  count: data.n || 0,
});
