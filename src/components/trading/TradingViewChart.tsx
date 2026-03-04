'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, Settings } from 'lucide-react';

interface TradingViewChartProps {
  symbol?: string;
  interval?: string;
  theme?: 'dark' | 'light';
  height?: number;
  hideTopToolbar?: boolean;
  hideSideToolbar?: boolean;
  allowSymbolChange?: boolean;
  className?: string;
  showIndicators?: boolean;
}

// Symbol mapping for common cryptocurrencies
const SYMBOL_MAP: Record<string, string> = {
  'BTC': 'BINANCE:BTCUSDT',
  'ETH': 'BINANCE:ETHUSDT',
  'BNB': 'BINANCE:BNBUSDT',
  'SOL': 'BINANCE:SOLUSDT',
  'XRP': 'BINANCE:XRPUSDT',
  'ADA': 'BINANCE:ADAUSDT',
  'DOGE': 'BINANCE:DOGEUSDT',
  'DOT': 'BINANCE:DOTUSDT',
  'MATIC': 'BINANCE:MATICUSDT',
  'AVAX': 'BINANCE:AVAXUSDT',
  'LINK': 'BINANCE:LINKUSDT',
  'LTC': 'BINANCE:LTCUSDT',
  'UNI': 'BINANCE:UNIUSDT',
  'ATOM': 'BINANCE:ATOMUSDT',
  'ETC': 'BINANCE:ETCUSDT',
};

export function TradingViewChart({
  symbol = 'BINANCE:BTCUSDT',
  interval = 'D',
  theme = 'dark',
  height = 500,
  hideTopToolbar = false,
  hideSideToolbar = true,
  allowSymbolChange = true,
  className,
  showIndicators = true,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSymbol, setCurrentSymbol] = useState(symbol);

  // Resolve symbol
  const resolvedSymbol = SYMBOL_MAP[symbol.toUpperCase()] || symbol;

  useEffect(() => {
    if (!containerRef.current) return;

    setIsLoading(true);

    // Clear previous widget
    containerRef.current.innerHTML = '';

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof window.TradingView !== 'undefined' && containerRef.current) {
        new window.TradingView.widget({
          autosize: true,
          symbol: resolvedSymbol,
          interval: interval,
          timezone: 'Europe/Oslo',
          theme: theme,
          style: '1',
          locale: 'no',
          toolbar_bg: theme === 'dark' ? '#0f172a' : '#f1f5f9',
          enable_publishing: false,
          hide_top_toolbar: hideTopToolbar,
          hide_side_toolbar: hideSideToolbar,
          allow_symbol_change: allowSymbolChange,
          save_image: false,
          container_id: containerRef.current.id,
          studies: showIndicators ? [
            'RSI@tv-basicstudies',
            'MASimple@tv-basicstudies',
            'Volume@tv-basicstudies',
          ] : [],
          disabled_features: [
            'header_symbol_search',
            'symbol_search_hot_key',
            'header_compare',
            'header_undo_redo',
            'header_screenshot',
            'header_chart_type',
            'timeframes_toolbar',
          ],
          enabled_features: [
            'use_localstorage_for_settings',
            'show_zoom_and_move_buttons_on_touch',
          ],
          overrides: {
            'mainSeriesProperties.showCountdown': true,
            'paneProperties.background': theme === 'dark' ? '#0a0b0d' : '#ffffff',
            'paneProperties.vertGridProperties.color': theme === 'dark' ? '#1e293b' : '#e2e8f0',
            'paneProperties.horzGridProperties.color': theme === 'dark' ? '#1e293b' : '#e2e8f0',
            'symbolWatermarkProperties.transparency': 90,
            'scalesProperties.textColor': theme === 'dark' ? '#94a3b8' : '#64748b',
          },
          loading_screen: {
            backgroundColor: theme === 'dark' ? '#0a0b0d' : '#ffffff',
            foregroundColor: theme === 'dark' ? '#3b82f6' : '#2563eb',
          },
        });
        setIsLoading(false);
      }
    };

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [resolvedSymbol, interval, theme, hideTopToolbar, hideSideToolbar, allowSymbolChange, showIndicators]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div 
      className={cn(
        "relative bg-slate-900 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300",
        isExpanded && "fixed inset-4 z-50",
        className
      )}
      style={{ height: isExpanded ? 'calc(100vh - 2rem)' : height }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white font-bold text-sm">
              ₿
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">{symbol.replace('BINANCE:', '').replace('USDT', '/USDT')}</h3>
              <p className="text-xs text-slate-500">TradingView Chart</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Quick symbol switcher */}
          <div className="hidden sm:flex items-center gap-1 mr-4">
            {['BTC', 'ETH', 'SOL'].map((coin) => (
              <button
                key={coin}
                onClick={() => setCurrentSymbol(SYMBOL_MAP[coin])}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                  currentSymbol.includes(coin)
                    ? "bg-blue-600 text-white"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                )}
              >
                {coin}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-white"
            onClick={toggleExpand}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative flex-1 h-[calc(100%-60px)]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-slate-500 text-sm">Laster TradingView...</p>
            </div>
          </div>
        )}
        <div 
          id={`tradingview-chart-${symbol.replace(/[^a-zA-Z0-9]/g, '-')}`}
          ref={containerRef}
          className="w-full h-full"
        />
      </div>

      {/* Close button when expanded */}
      {isExpanded && (
        <button
          onClick={toggleExpand}
          className="absolute top-4 right-16 z-10 p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

// Mini chart for dashboard
export function TradingViewMiniChart({ symbol = 'BINANCE:BTCUSDT' }: { symbol?: string }) {
  return (
    <TradingViewChart
      symbol={symbol}
      height={300}
      hideTopToolbar={true}
      hideSideToolbar={true}
      allowSymbolChange={false}
      showIndicators={false}
      interval="4H"
    />
  );
}

// Full chart for paper trading
export function TradingViewFullChart({ symbol = 'BINANCE:BTCUSDT' }: { symbol?: string }) {
  return (
    <TradingViewChart
      symbol={symbol}
      height={600}
      hideTopToolbar={false}
      hideSideToolbar={false}
      allowSymbolChange={true}
      showIndicators={true}
      interval="D"
    />
  );
}

// Declare TradingView on window
declare global {
  interface Window {
    TradingView: {
      widget: new (config: Record<string, unknown>) => void;
    };
  }
}
