"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
}

// Major crypto pairs from Binance
const TRACKED_SYMBOLS = [
  { symbol: "BTCUSDT", name: "Bitcoin", display: "BTC" },
  { symbol: "ETHUSDT", name: "Ethereum", display: "ETH" },
  { symbol: "SOLUSDT", name: "Solana", display: "SOL" },
  { symbol: "XRPUSDT", name: "XRP", display: "XRP" },
  { symbol: "DOGEUSDT", name: "Dogecoin", display: "DOGE" },
  { symbol: "ADAUSDT", name: "Cardano", display: "ADA" },
];

export function LivePriceTicker() {
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initial fetch
    fetchPrices();
    
    // Set up WebSocket connection to Binance
    const streams = TRACKED_SYMBOLS.map(s => `${s.symbol.toLowerCase()}@ticker`).join('/');
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);
    
    ws.onopen = () => {
      setIsConnected(true);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.s && data.c && data.P) {
        setPrices(prev => {
          const newPrices = [...prev];
          const index = newPrices.findIndex(p => p.symbol === data.s);
          const priceData: PriceData = {
            symbol: data.s,
            price: parseFloat(data.c),
            change24h: parseFloat(data.P),
          };
          
          if (index >= 0) {
            newPrices[index] = priceData;
          } else {
            newPrices.push(priceData);
          }
          
          // Sort by TRACKED_SYMBOLS order
          return TRACKED_SYMBOLS.map(t => 
            newPrices.find(p => p.symbol === t.symbol) || {
              symbol: t.symbol,
              price: 0,
              change24h: 0,
            }
          ).filter(p => p.price > 0);
        });
        setLastUpdate(new Date());
      }
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

  const fetchPrices = async () => {
    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT","DOGEUSDT","ADAUSDT"]');
      const data = await response.json();
      
      const formattedPrices = data.map((item: { symbol: string; lastPrice: string; priceChangePercent: string }) => ({
        symbol: item.symbol,
        price: parseFloat(item.lastPrice),
        change24h: parseFloat(item.priceChangePercent),
      }));
      
      setPrices(formattedPrices);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    }
  };

  const formatPrice = (price: number, symbol: string): string => {
    if (symbol === "BTCUSDT") {
      return price.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    if (price < 1) {
      return price.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }
    if (price < 100) {
      return price.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return price.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getSymbolInfo = (symbol: string) => {
    return TRACKED_SYMBOLS.find(s => s.symbol === symbol) || { name: symbol, display: symbol };
  };

  return (
    <div className="w-full bg-slate-900/80 backdrop-blur-sm border-y border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-slate-400">Live fra Binance</span>
          </div>
          {lastUpdate && (
            <span className="text-xs text-slate-500">
              Oppdatert: {lastUpdate.toLocaleTimeString('nb-NO')}
            </span>
          )}
        </div>
        
        <div className="flex gap-6 overflow-x-auto pb-3 scrollbar-hide">
          {prices.map((price) => {
            const info = getSymbolInfo(price.symbol);
            const isPositive = price.change24h >= 0;
            
            return (
              <div key={price.symbol} className="flex-shrink-0 flex items-center gap-3 min-w-fit">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{info.display}</span>
                  <span className="text-slate-400 text-sm hidden sm:inline">{info.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white">
                    {formatPrice(price.price, price.symbol)}
                  </span>
                  <span className={`flex items-center text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {isPositive ? '+' : ''}{price.change24h.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
          
          {prices.length === 0 && (
            <div className="text-slate-500 text-sm">Laster live priser...</div>
          )}
        </div>
      </div>
    </div>
  );
}
