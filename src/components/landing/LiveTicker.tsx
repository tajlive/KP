'use client';

import { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
}

export function LiveTicker() {
  const [prices, setPrices] = useState<PriceData[]>([
    { symbol: 'BTC', price: 0, change24h: 0 },
    { symbol: 'ETH', price: 0, change24h: 0 },
    { symbol: 'SOL', price: 0, change24h: 0 },
  ]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Binance WebSocket for 24hr ticker
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker/ethusdt@ticker/solusdt@ticker');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const symbol = data.s.replace('USDT', '');
      const price = parseFloat(data.c);
      const change24h = parseFloat(data.P);

      setPrices((prev) => {
        const existing = prev.find((p) => p.symbol === symbol);
        if (existing) {
          return prev.map((p) =>
            p.symbol === symbol ? { ...p, price, change24h } : p
          );
        }
        return [...prev, { symbol, price, change24h }];
      });
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  const formatPrice = (price: number) => {
    if (price === 0) return '—';
    return price >= 1000 
      ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `$${price.toFixed(2)}`;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  return (
    <div className="w-full bg-slate-950 border-y border-slate-800 overflow-hidden">
      <div className="flex items-center gap-8 py-3 animate-scroll-x">
        {[...prices, ...prices, ...prices].map((coin, idx) => (
          <div
            key={`${coin.symbol}-${idx}`}
            className="flex items-center gap-3 px-4 shrink-0"
          >
            <span className="font-fraunces font-bold text-lg text-slate-100">
              {coin.symbol}
            </span>
            <span className="font-lexend text-slate-300 tabular-nums">
              {formatPrice(coin.price)}
            </span>
            <span
              className={`flex items-center gap-1 font-lexend text-sm ${
                coin.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {coin.change24h >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {formatChange(coin.change24h)}
            </span>
            {!isConnected && idx === 0 && (
              <span className="text-xs text-amber-400 ml-2">(connecting...)</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
