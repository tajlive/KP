'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  LineStyle,
  CandlestickSeries,
} from 'lightweight-charts';
import { useTradingStore } from '@/store/tradingStore';
import { TrendingUp, TrendingDown, Maximize2 } from 'lucide-react';
import { motion } from 'framer-motion';

// Binance kline data structure
interface BinanceKline {
  0: number;  // Open time
  1: string;  // Open price
  2: string;  // High price
  3: string;  // Low price
  4: string;  // Close price
  5: string;  // Volume
  6: number;  // Close time
  7: string;  // Quote asset volume
  8: number;  // Number of trades
  9: string;  // Taker buy base asset volume
  10: string; // Taker buy quote asset volume
  11: string; // Ignore
}

// Timeframe type
type TimeframeValue = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

interface TimeframeOption {
  value: TimeframeValue;
  label: string;
}

const timeframes: TimeframeOption[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
];

export default function ProfessionalChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const { 
    selectedSymbol, 
    selectedTimeframe, 
    setSelectedTimeframe,
    marketData 
  } = useTradingStore();

  const currentMarket = marketData[selectedSymbol];
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { 
          color: 'rgba(31, 41, 55, 0.5)',
          style: LineStyle.Dotted,
        },
        horzLines: { 
          color: 'rgba(31, 41, 55, 0.5)',
          style: LineStyle.Dotted,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: isFullscreen ? window.innerHeight - 200 : 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#374151',
        rightOffset: 12,
        barSpacing: 8,
      },
      rightPriceScale: {
        borderColor: '#374151',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#6B7280',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1F2937',
        },
        horzLine: {
          color: '#6B7280',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1F2937',
        },
      },
      localization: {
        priceFormatter: (price: number) => {
          return `$${price.toLocaleString('en-US', { 
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
        },
      },
    });

    chartRef.current = chart;

    // Add candlestick series (v5 API)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#10B981',
      borderDownColor: '#EF4444',
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });

    candlestickSeriesRef.current = candlestickSeries;

    // Fetch historical data
    fetchChartData(selectedSymbol, selectedTimeframe);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: isFullscreen ? window.innerHeight - 200 : 500,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [selectedSymbol, selectedTimeframe, isFullscreen]);

  const fetchChartData = async (symbol: string, interval: string) => {
    if (!candlestickSeriesRef.current) return;

    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`
      );
      
      const data: BinanceKline[] = await response.json();

      const candlesticks: CandlestickData[] = data.map((d) => ({
        time: Math.floor(d[0] / 1000) as Time,
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
      }));

      candlestickSeriesRef.current.setData(candlesticks);
      chartRef.current?.timeScale().fitContent();

    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 overflow-hidden ${
      isFullscreen ? 'fixed inset-4 z-50' : ''
    }`}>
      {/* Header */}
      <div className="p-4 lg:p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Symbol & Price */}
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                  {selectedSymbol}
                </h3>
                {currentMarket && (
                  <motion.span
                    key={currentMarket.price}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className={`text-sm font-bold px-2 py-1 rounded ${
                      currentMarket.changePercent24h >= 0 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                    }`}
                  >
                    {currentMarket.changePercent24h >= 0 ? '+' : ''}
                    {currentMarket.changePercent24h?.toFixed(2)}%
                  </motion.span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-3xl font-black text-gray-900 dark:text-white">
                  ${(currentMarket?.price ?? 0).toLocaleString('en-US', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                {currentMarket && (
                  <span className={`flex items-center gap-1 text-sm font-bold ${
                    currentMarket.changePercent24h >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {currentMarket.changePercent24h >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    ${Math.abs(currentMarket.change24h || 0).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Timeframe selector */}
            <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {timeframes.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setSelectedTimeframe(tf.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    selectedTimeframe === tf.value
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Actions */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              <Maximize2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* 24h Stats */}
        {currentMarket && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">24h High</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                ${currentMarket.high24h?.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">24h Low</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                ${currentMarket.low24h?.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">24h Volume</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                ${((currentMarket?.volume24h ?? 0) / 1000000).toFixed(2)}M
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Last Update</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                {currentMarket.lastUpdate 
                  ? new Date(currentMarket.lastUpdate).toLocaleTimeString() 
                  : '-'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
