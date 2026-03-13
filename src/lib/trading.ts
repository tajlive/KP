import { supabase } from './supabase';
import type { Trade, PortfolioItem, Wallet, TradingStats } from '@/types';

// Trading fee (0.1% - matching Binance)
export const TRADING_FEE_PERCENT = 0.001;

// Starting capital for paper trading
export const STARTING_CAPITAL = 100000;

// Execute a buy trade
export const executeBuy = async (
  userId: string,
  symbol: string,
  quantity: number,
  price: number
): Promise<{ success: boolean; trade?: Trade; error?: string }> => {
  try {
    const totalAmount = quantity * price;
    const fee = totalAmount * TRADING_FEE_PERCENT;
    const totalCost = totalAmount + fee;

    // Check wallet balance
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single() as unknown;

    if (walletError || !walletData) {
      return { success: false, error: 'Wallet not found' };
    }

    const wallet = walletData as Wallet;

    if (wallet.balance_usdt < totalCost) {
      return { success: false, error: 'Insufficient balance' };
    }

    // Execute trade via RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error: tradeError } = await (supabase.rpc as any)('execute_trade', {
      p_user_id: userId,
      p_symbol: symbol,
      p_type: 'buy',
      p_quantity: quantity,
      p_price: price,
    });

    if (tradeError) {
      console.error('Trade execution error:', tradeError);
      return { success: false, error: tradeError.message };
    }

    const tradeResult = result as { success?: boolean; message?: string; trade_id?: string } | null;

    if (!tradeResult?.success) {
      return { success: false, error: tradeResult?.message || 'Trade failed' };
    }

    // Fetch the created trade
    const { data: trade, error: fetchError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeResult.trade_id as string)
      .single() as unknown;

    if (fetchError || !trade) {
      return { success: false, error: 'Failed to fetch trade' };
    }

    return { success: true, trade };
  } catch (error) {
    console.error('Buy execution error:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};

// Execute a sell trade
export const executeSell = async (
  userId: string,
  symbol: string,
  quantity: number,
  price: number
): Promise<{ success: boolean; trade?: Trade; error?: string }> => {
  try {
    // Check portfolio
    const { data: portfolioData, error: portfolioError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .eq('symbol', symbol)
      .single() as unknown;

    if (portfolioError || !portfolioData) {
      return { success: false, error: 'No position found for this symbol' };
    }

    const position = portfolioData as PortfolioItem;

    if (position.quantity < quantity) {
      return { success: false, error: 'Insufficient quantity to sell' };
    }

    // Execute trade via RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error: tradeError } = await (supabase.rpc as any)('execute_trade', {
      p_user_id: userId,
      p_symbol: symbol,
      p_type: 'sell',
      p_quantity: quantity,
      p_price: price,
    });

    if (tradeError) {
      console.error('Trade execution error:', tradeError);
      return { success: false, error: tradeError.message };
    }

    const tradeResult = result as { success?: boolean; message?: string; trade_id?: string } | null;

    if (!tradeResult?.success) {
      return { success: false, error: tradeResult?.message || 'Trade failed' };
    }

    // Fetch the created trade
    const { data: trade, error: fetchError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeResult.trade_id as string)
      .single() as unknown;

    if (fetchError || !trade) {
      return { success: false, error: 'Failed to fetch trade' };
    }

    return { success: true, trade };
  } catch (error) {
    console.error('Sell execution error:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};

// Get user's wallet
export const getWallet = async (userId: string): Promise<Wallet | null> => {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single() as unknown;

  if (error) {
    console.error('Error fetching wallet:', error);
    return null;
  }

  return data as Wallet;
};

// Get user's portfolio
export const getPortfolio = async (userId: string): Promise<PortfolioItem[]> => {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .gt('quantity', 0)
    .order('current_value', { ascending: false });

  if (error) {
    console.error('Error fetching portfolio:', error);
    return [];
  }

  return (data || []) as PortfolioItem[];
};

// Get user's trades
export const getTrades = async (
  userId: string,
  options: { limit?: number; offset?: number; symbol?: string } = {}
): Promise<Trade[]> => {
  const { limit = 50, offset = 0, symbol } = options;

  let query = supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (symbol) {
    query = query.eq('symbol', symbol);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching trades:', error);
    return [];
  }

  return (data || []) as Trade[];
};

// Get trading stats
export const getTradingStats = async (userId: string): Promise<TradingStats | null> => {
  const { data, error } = await supabase
    .from('trading_stats')
    .select('*')
    .eq('user_id', userId)
    .single() as unknown;

  if (error) {
    console.error('Error fetching trading stats:', error);
    return null;
  }

  return data as TradingStats;
};

// Calculate unrealized P&L for a position
export const calculateUnrealizedPnL = (
  quantity: number,
  avgBuyPrice: number,
  currentPrice: number
): { pnl: number; pnlPercent: number } => {
  const costBasis = quantity * avgBuyPrice;
  const currentValue = quantity * currentPrice;
  const pnl = currentValue - costBasis;
  const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

  return { pnl, pnlPercent };
};

// Calculate total portfolio value
export const calculatePortfolioValue = (portfolio: PortfolioItem[]): number => {
  return portfolio.reduce((total, item) => total + item.current_value, 0);
};

// Calculate total P&L (realized + unrealized)
export const calculateTotalPnL = (
  wallet: Wallet,
  portfolio: PortfolioItem[],
  stats: TradingStats | null
): {
  totalValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalPnL: number;
  totalPnLPercent: number;
} => {
  const portfolioValue = calculatePortfolioValue(portfolio);
  const totalValue = wallet.balance_usdt + portfolioValue;
  const unrealizedPnL = portfolio.reduce((sum, item) => sum + item.unrealized_pnl, 0);
  const realizedPnL = stats?.total_pnl || 0;
  const totalPnL = unrealizedPnL + realizedPnL;
  const totalPnLPercent = STARTING_CAPITAL > 0 ? (totalPnL / STARTING_CAPITAL) * 100 : 0;

  return {
    totalValue,
    unrealizedPnL,
    realizedPnL,
    totalPnL,
    totalPnLPercent,
  };
};

// Format currency
export const formatCurrency = (value: number, currency: string = 'USDT'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'USDT' ? 'USD' : currency,
    minimumFractionDigits: value >= 1000 ? 0 : 2,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
};

// Format percentage
export const formatPercentage = (value: number, decimals: number = 2): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

// Get color class based on value
export const getValueColor = (value: number): string => {
  if (value > 0) return 'text-emerald-400';
  if (value < 0) return 'text-red-400';
  return 'text-gray-400';
};

// Get background color class based on value
export const getValueBgColor = (value: number): string => {
  if (value > 0) return 'bg-emerald-500/10';
  if (value < 0) return 'bg-red-500/10';
  return 'bg-gray-500/10';
};

// Validate trade quantity
export const validateQuantity = (
  quantity: number,
  minQty: number = 0.0001,
  maxQty?: number
): { valid: boolean; error?: string } => {
  if (quantity <= 0) {
    return { valid: false, error: 'Quantity must be greater than 0' };
  }

  if (quantity < minQty) {
    return { valid: false, error: `Minimum quantity is ${minQty}` };
  }

  if (maxQty !== undefined && quantity > maxQty) {
    return { valid: false, error: `Maximum quantity is ${maxQty}` };
  }

  return { valid: true };
};

// Calculate position size based on risk
export const calculatePositionSize = (
  accountBalance: number,
  riskPercent: number,
  entryPrice: number,
  stopLossPrice: number
): { quantity: number; positionValue: number; riskAmount: number } => {
  const riskAmount = accountBalance * (riskPercent / 100);
  const priceRisk = Math.abs(entryPrice - stopLossPrice);
  const quantity = priceRisk > 0 ? riskAmount / priceRisk : 0;
  const positionValue = quantity * entryPrice;

  return { quantity, positionValue, riskAmount };
};

// Trigger panic button - close all positions
export const triggerPanicButton = async (
  userId: string,
  reason?: string
): Promise<{
  success: boolean;
  positionsClosed: number;
  totalValue: number;
  error?: string;
}> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await (supabase.rpc as any)('trigger_panic_button', {
      p_user_id: userId,
      p_reason: reason || 'User triggered panic',
    });

    if (error) {
      console.error('Panic button error:', error);
      return { success: false, positionsClosed: 0, totalValue: 0, error: error.message };
    }

    const panicResult = result as { success?: boolean; positions_closed?: number; total_value?: number } | null;

    return {
      success: panicResult?.success || false,
      positionsClosed: panicResult?.positions_closed || 0,
      totalValue: panicResult?.total_value || 0,
    };
  } catch (error) {
    console.error('Panic button error:', error);
    return {
      success: false,
      positionsClosed: 0,
      totalValue: 0,
      error: 'Unexpected error occurred',
    };
  }
};
