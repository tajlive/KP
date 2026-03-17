'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTradingStore, Position } from '@/store/tradingStore';
import { calculateSlippage, SlippageResult } from '@/lib/paper-trading/slippage';
import { fetchMarketVolatility } from '@/lib/paper-trading/slippage';

interface PaperTradeResult {
  success: boolean;
  error?: string;
  slippage?: {
    bps: number;
    amount: number;
  };
}

export interface PaperTradingEngine {
  balance: number;
  positions: Position[];
  price: number;
  unrealizedPnL: number;
  maxDrawdown: number;
  pnlHistory: number[];
  placeOrder: (order: {
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    amount: number;
    price?: number;
  }) => Promise<PaperTradeResult>;
  closePosition: (positionId: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
  error: string | null;
}

const PAPER_BALANCE = 100_000; // 100k NOK paper balance
const INITIAL_PRICE = 850000; // BTC price in NOK

export function usePaperTradingEngine(symbol: string): PaperTradingEngine {
  const { user } = useAuth();
  const supabase = createClient();
  
  const { 
    portfolio, 
    positions, 
    marketData, 
    updateMarketData, 
    openPosition, 
    closePosition: closeStorePosition,
    trades 
  } = useTradingStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pnlHistory, setPnlHistory] = useState<number[]>([]);
  const [maxDrawdown, setMaxDrawdown] = useState(0);

  // Get current price
  const price = marketData[symbol]?.price || INITIAL_PRICE;

  // Calculate unrealized PnL
  const unrealizedPnL = useMemo(() => {
    return positions.reduce((sum, pos) => sum + pos.pnl, 0);
  }, [positions]);

  // Update price simulation
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate small price movements
      const volatility = 0.002; // 0.2% volatility
      const change = (Math.random() - 0.5) * 2 * volatility;
      const newPrice = price * (1 + change);
      
      updateMarketData(symbol, {
        price: newPrice,
        lastUpdate: new Date().toISOString(),
      });

      // Update position PnLs
      positions.forEach((pos) => {
        useTradingStore.getState().updatePosition(pos.id, newPrice);
      });

      // Update PnL history for stress calculation
      setPnlHistory((prev) => {
        const newHistory = [...prev, unrealizedPnL].slice(-50);
        return newHistory;
      });

      // Update max drawdown
      const peak = Math.max(...pnlHistory, 0);
      const currentDD = peak > 0 ? ((peak - unrealizedPnL) / peak) * 100 : 0;
      setMaxDrawdown((prev) => Math.max(prev, currentDD));
    }, 2000);

    return () => clearInterval(interval);
  }, [symbol, price, positions.length, unrealizedPnL, pnlHistory.length]);

  // Fetch volatility on mount
  useEffect(() => {
    fetchMarketVolatility(symbol);
  }, [symbol]);

  // Place order with slippage simulation
  const placeOrder = useCallback(
    async (order: {
      side: 'buy' | 'sell';
      type: 'market' | 'limit';
      amount: number;
      price?: number;
    }): Promise<PaperTradeResult> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!user) {
          throw new Error('Not authenticated');
        }

        // Calculate slippage for market orders
        let executionPrice = price;
        let slippageResult: SlippageResult | null = null;

        if (order.type === 'market') {
          slippageResult = calculateSlippage({
            symbol,
            side: order.side,
            orderType: order.type,
            amount: order.amount,
            currentPrice: price,
          });
          executionPrice = slippageResult.executionPrice;
        } else if (order.type === 'limit' && order.price) {
          executionPrice = order.price;
        }

        // Optimistic update: show position in UI immediately
        if (order.side === 'buy') {
          openPosition({
            symbol,
            side: 'long',
            entryPrice: executionPrice,
            quantity: order.amount,
            leverage: 1,
          });
        }

        // Persist to database in background
        const { error: tradeError } = await supabase.rpc(
          'place_paper_trade_with_slippage',
          {
            p_user_id: user.id,
            p_symbol: symbol,
            p_side: order.side,
            p_order_type: order.type,
            p_amount: order.amount,
            p_requested_price: price,
          }
        );

        if (tradeError) {
          console.warn('RPC failed, position kept in local store:', tradeError);
        }

        return {
          success: true,
          slippage: slippageResult
            ? {
                bps: slippageResult.slippageBps,
                amount: slippageResult.slippageAmount,
              }
            : undefined,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Trade failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [user, symbol, price, supabase, openPosition]
  );

  // Close position
  const closePositionHandler = useCallback(
    async (positionId: string): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const position = positions.find((p) => p.id === positionId);
        if (!position) {
          throw new Error('Position not found');
        }

        // Close in store
        closeStorePosition(positionId);

        // Update database
        if (user) {
          await supabase.rpc('close_paper_trade', {
            p_trade_id: positionId,
            p_exit_price: price,
            p_pnl: position.pnl,
          });
        }

        return { success: true };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Close failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [positions, price, user, supabase, closeStorePosition]
  );

  return {
    balance: portfolio.balance,
    positions,
    price,
    unrealizedPnL,
    maxDrawdown,
    pnlHistory,
    placeOrder,
    closePosition: closePositionHandler,
    isLoading,
    error,
  };
}
