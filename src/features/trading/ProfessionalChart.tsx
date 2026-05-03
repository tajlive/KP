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
  SeriesMarker,
} from 'lightweight-charts';
import { useTradingStore } from '@/store/tradingStore';
import { createClient } from '@/lib/supabase/client';
import { buildTradeExplanation } from '@/lib/trading/build-trade-reason';
import type { TradeReasonCode, TradeReasonParams } from '@/types/trading';
import { TrendingUp, TrendingDown, Maximize2, Info, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TradeMarker {
  time: number;
  side: 'buy' | 'sell';
  price: number;
  reason?: string;
  pnl?: number;
  reasonCode?: TradeReasonCode;
  reasonParams?: TradeReasonParams;
}

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
  const [trades, setTrades] = useState<TradeMarker[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<TradeMarker | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Fetch user's trades for this symbol
  useEffect(() => {
    async function fetchTrades() {
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) return;

        const { data: tradeData } = await supabase
          .from('trades')
          .select('executed_at, side, price, realized_pnl, strategy_signal, reason_code, reason_params')
          .eq('trading_pair', selectedSymbol.replace('/', ''))
          .order('executed_at', { ascending: false })
          .limit(50);

        if (tradeData) {
          const markers: TradeMarker[] = tradeData.map((t) => {
            const reasonCode = (t.reason_code as TradeReasonCode) || 'UNKNOWN';
            const reasonParams = (t.reason_params as TradeReasonParams) || {};
            const explanation = buildTradeExplanation(reasonCode, reasonParams);
            
            return {
              time: Math.floor(new Date(t.executed_at).getTime() / 1000),
              side: t.side as 'buy' | 'sell',
              price: Number(t.price),
              reason: explanation.description,
              pnl: t.realized_pnl ? Number(t.realized_pnl) : undefined,
              reasonCode,
              reasonParams,
            };
          });
          setTrades(markers.reverse());
        }
      } catch (err) {
        console.error('Failed to fetch trades for chart:', err);
      }
    }
    fetchTrades();
  }, [selectedSymbol]);

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

    // Click handler for trade markers
    chart.subscribeClick((param) => {
      if (!param.time || !param.point) return;
      const clickTime = param.time as number;
      
      // Find closest trade within 5 minutes
      const closestTrade = trades.find((t) => Math.abs(t.time - clickTime) < 300);
      if (closestTrade) {
        setSelectedTrade(closestTrade);
        setShowExplanation(true);
      }
    });

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

  // Update markers when trades change (after initial chart load)
  useEffect(() => {
    if (!candlestickSeriesRef.current || trades.length === 0) return;
    
    const chartMarkers: SeriesMarker<Time>[] = trades.map((trade) => {
      const explanation = trade.reasonCode 
        ? buildTradeExplanation(trade.reasonCode, trade.reasonParams || {})
        : null;
      const emoji = explanation?.emoji || (trade.side === 'buy' ? '🟢' : '🔴');
      const shortTitle = explanation?.title || (trade.side === 'buy' ? 'Kjøp' : 'Salg');
      const confidence = explanation?.confidence || 1;
      
      return {
        time: trade.time as Time,
        position: trade.side === 'buy' ? 'belowBar' : 'aboveBar',
        color: trade.side === 'buy' ? '#10B981' : '#EF4444',
        shape: trade.side === 'buy' ? 'arrowUp' : 'arrowDown',
        text: `${emoji} ${shortTitle}`,
        size: confidence,
      };
    });
    
    (candlestickSeriesRef.current as unknown as { setMarkers: (m: SeriesMarker<Time>[]) => void }).setMarkers(chartMarkers);
  }, [trades]);

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

      // Add trade markers
      if (trades.length > 0) {
        const chartMarkers: SeriesMarker<Time>[] = trades.map((trade) => {
          const explanation = trade.reasonCode 
            ? buildTradeExplanation(trade.reasonCode, trade.reasonParams || {})
            : null;
          const emoji = explanation?.emoji || (trade.side === 'buy' ? '🟢' : '🔴');
          const shortTitle = explanation?.title || (trade.side === 'buy' ? 'Kjøp' : 'Salg');
          const confidence = explanation?.confidence || 1;
          
          return {
            time: trade.time as Time,
            position: trade.side === 'buy' ? 'belowBar' : 'aboveBar',
            color: trade.side === 'buy' ? '#10B981' : '#EF4444',
            shape: trade.side === 'buy' ? 'arrowUp' : 'arrowDown',
            text: `${emoji} ${shortTitle}`,
            size: confidence,
          };
        });
        (candlestickSeriesRef.current as unknown as { setMarkers: (m: SeriesMarker<Time>[]) => void }).setMarkers(chartMarkers);
      }

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

      {/* Trade Explanation Panel */}
      <AnimatePresence>
        {trades.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 dark:border-gray-800"
          >
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Siste handler
                </h4>
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
                >
                  <Info className="w-3 h-3" />
                  {showExplanation ? 'Skjul forklaring' : 'Hvorfor dette skjer'}
                </button>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-1">
                {trades.slice(-5).map((trade, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedTrade(selectedTrade?.time === trade.time ? null : trade)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      trade.side === 'buy'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                    } ${selectedTrade?.time === trade.time ? 'ring-2 ring-blue-500/50' : ''}`}
                  >
                    {trade.side === 'buy' ? (
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownCircle className="w-3.5 h-3.5" />
                    )}
                    <span>{trade.side === 'buy' ? 'Kjøp' : 'Salg'}</span>
                    <span className="text-gray-400">@</span>
                    <span>${trade.price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    {trade.pnl !== undefined && (
                      <span className={trade.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(0)} NOK
                      </span>
                    )}
                  </button>
                ))}
              </div>
              
              {showExplanation && selectedTrade && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  {(() => {
                    const explanation = selectedTrade.reasonCode 
                      ? buildTradeExplanation(selectedTrade.reasonCode, selectedTrade.reasonParams || {})
                      : null;
                    return explanation ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{explanation.emoji}</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {explanation.title}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            explanation.confidence === 3 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : explanation.confidence === 2
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {explanation.confidence === 3 ? 'Sterkt signal' : explanation.confidence === 2 ? 'Moderat' : 'Svakt'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {explanation.description}
                        </p>
                        {explanation.tip && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                            💡 {explanation.tip}
                          </p>
                        )}
                        {selectedTrade.pnl !== undefined && (
                          <p className={`text-sm font-semibold mt-2 ${
                            selectedTrade.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {selectedTrade.pnl >= 0 ? '✅' : '🛑'} Realisert P&L: {selectedTrade.pnl >= 0 ? '+' : ''}{selectedTrade.pnl.toFixed(0)} NOK
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-semibold">
                          {selectedTrade.side === 'buy' ? 'Kjøpssignal:' : 'Salgsignal:'}
                        </span>{' '}
                        {selectedTrade.reason || 'Teknisk indikator utløst'}
                      </p>
                    );
                  })()}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chart */}
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
