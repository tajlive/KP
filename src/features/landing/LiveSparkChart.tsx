'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PricePoint {
  timestamp: number;
  price: number;
}

interface LiveSparkChartProps {
  symbol: 'BTC' | 'ETH';
  className?: string;
}

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
const MAX_POINTS = 30;
const UPDATE_INTERVAL = 2000;

export function LiveSparkChart({ symbol, className = '' }: LiveSparkChartProps) {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);

  const symbolPair = `${symbol.toLowerCase()}usdt@ticker`;
  const displayName = symbol;
  const color = symbol === 'BTC' ? '#F7931A' : '#627EEA';

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket(`${BINANCE_WS_URL}/${symbolPair}`);

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const price = parseFloat(data.c);
        const change24h = parseFloat(data.P);

        setCurrentPrice(price);
        setPriceChange(change24h);

        setPriceHistory((prev) => {
          const now = Date.now();
          const newPoint = { timestamp: now, price };
          const updated = [...prev, newPoint];
          return updated.slice(-MAX_POINTS);
        });
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimer = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [symbolPair]);

  // Generate SVG path from price history
  const sparklinePath = useMemo(() => {
    if (priceHistory.length < 2) return '';

    const prices = priceHistory.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const width = 120;
    const height = 40;
    const padding = 4;

    const points = priceHistory.map((point, index) => {
      const x = (index / (MAX_POINTS - 1)) * (width - padding * 2) + padding;
      const y = height - ((point.price - min) / range) * (height - padding * 2) - padding;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [priceHistory]);

  const isPositive = priceChange >= 0;

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${price.toFixed(2)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-kp-surface/80 backdrop-blur-sm rounded-xl border border-kp-border 
                  p-3 min-w-[140px] ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-semibold text-kp-text-primary">
            {displayName}
          </span>
        </div>
        <div
          className={`flex items-center gap-0.5 text-xs ${
            isPositive ? 'text-kp-success' : 'text-kp-error'
          }`}
        >
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{isPositive ? '+' : ''}{priceChange.toFixed(2)}%</span>
        </div>
      </div>

      {/* Price */}
      <div className="text-lg font-bold text-kp-text-primary mb-1">
        {currentPrice > 0 ? formatPrice(currentPrice) : '—'}
      </div>

      {/* Sparkline */}
      <div className="h-10 w-full">
        {priceHistory.length > 2 ? (
          <svg
            viewBox="0 0 120 40"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isPositive ? '#10b981' : '#ef4444'}
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor={isPositive ? '#10b981' : '#ef4444'}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <path
              d={sparklinePath}
              fill="none"
              stroke={isPositive ? '#10b981' : '#ef4444'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={`${sparklinePath} L 120,40 L 0,40 Z`}
              fill={`url(#gradient-${symbol})`}
              opacity={0.3}
            />
          </svg>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-kp-brand/30 border-t-kp-brand rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Connection indicator */}
      <div
        className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${
          isConnected ? 'bg-kp-success animate-pulse' : 'bg-kp-error'
        }`}
      />
    </motion.div>
  );
}

// Dual chart component for hero
export function LiveSparkChartHero() {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <LiveSparkChart symbol="BTC" />
      <LiveSparkChart symbol="ETH" />
    </div>
  );
}

export default LiveSparkChart;
