'use client';

import { useTradingStore } from '@/store/tradingStore';
import type { BinanceTicker, BinanceKline } from '@/types/database';

type WebSocketMessage = BinanceTicker | BinanceKline;

class MarketDataService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setInterval> | null = null;
  private subscribedSymbols: Set<string> = new Set();
  private isConnecting = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  connect() {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) return;
    
    this.isConnecting = true;

    try {
      this.ws = new WebSocket('wss://stream.binance.com:9443/ws');

      this.ws.onopen = () => {
        console.info('[MarketData] WebSocket connected');
        this.isConnecting = false;
        
        // Re-subscribe to all symbols
        this.subscribedSymbols.forEach((symbol) => {
          this.subscribeToSymbol(symbol);
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          this.handleMessage(data);
        } catch (error) {
          console.error('[MarketData] Parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[MarketData] WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.info('[MarketData] WebSocket closed');
        this.isConnecting = false;
        this.reconnect();
      };

    } catch (error) {
      console.error('[MarketData] Connection error:', error);
      this.isConnecting = false;
      this.reconnect();
    }
  }

  reconnect() {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setInterval(() => {
      console.info('[MarketData] Attempting reconnect...');
      this.connect();
      
      if (this.ws?.readyState === WebSocket.OPEN) {
        if (this.reconnectTimer) {
          clearInterval(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      }
    }, 5000);
  }

  subscribeToSymbol(symbol: string) {
    const upperSymbol = symbol.toUpperCase();
    this.subscribedSymbols.add(upperSymbol);

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const subscription = {
      method: 'SUBSCRIBE',
      params: [
        `${upperSymbol.toLowerCase()}@ticker`,
        `${upperSymbol.toLowerCase()}@trade`,
      ],
      id: Date.now(),
    };

    this.ws.send(JSON.stringify(subscription));
    console.info(`[MarketData] Subscribed to ${upperSymbol}`);
  }

  unsubscribeFromSymbol(symbol: string) {
    const upperSymbol = symbol.toUpperCase();
    this.subscribedSymbols.delete(upperSymbol);

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const unsubscription = {
      method: 'UNSUBSCRIBE',
      params: [
        `${upperSymbol.toLowerCase()}@ticker`,
        `${upperSymbol.toLowerCase()}@trade`,
      ],
      id: Date.now(),
    };

    this.ws.send(JSON.stringify(unsubscription));
    console.info(`[MarketData] Unsubscribed from ${upperSymbol}`);
  }

  private handleMessage(data: WebSocketMessage) {
    // Handle 24hr ticker updates
    if (data.e === '24hrTicker') {
      const ticker = data as BinanceTicker;
      const symbol = ticker.s;
      
      useTradingStore.getState().updateMarketData(symbol, {
        symbol,
        price: parseFloat(ticker.c),
        change24h: parseFloat(ticker.p),
        changePercent24h: parseFloat(ticker.P),
        high24h: parseFloat(ticker.h),
        low24h: parseFloat(ticker.l),
        volume24h: parseFloat(ticker.v),
      });

      // Update positions
      const positions = useTradingStore.getState().positions;
      positions.forEach((position) => {
        if (position.symbol === symbol) {
          useTradingStore.getState().updatePosition(position.id, parseFloat(ticker.c));
        }
      });
    }

    // Handle real-time trade updates
    if (data.e === 'trade') {
      const kline = data as BinanceKline;
      const symbol = kline.s;
      const price = parseFloat(kline.k.c);
      
      useTradingStore.getState().updateMarketData(symbol, { price });

      // Update positions
      const positions = useTradingStore.getState().positions;
      positions.forEach((position) => {
        if (position.symbol === symbol) {
          useTradingStore.getState().updatePosition(position.id, price);
        }
      });
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.subscribedSymbols.clear();
  }
}

// Singleton instance
export const marketDataService = new MarketDataService();

// React hook for components
export function useMarketData(symbol: string) {
  const { marketData } = useTradingStore();

  // Subscribe on mount
  if (typeof window !== 'undefined') {
    marketDataService.subscribeToSymbol(symbol);
  }

  return marketData[symbol];
}
