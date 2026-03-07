import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase-generated';

export interface PaperTradingSession {
  id: string;
  user_id: string;
  starting_balance: number;
  current_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaperTrade {
  session_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  total_value: number;
}

export interface TradeHistoryItem {
  id: string;
  session_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  total_value: number;
  created_at: string;
}

/**
 * Create a new paper trading session for a user
 */
export async function createPaperTradingSession(userId: string): Promise<PaperTradingSession> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('paper_trading_sessions')
    .insert({
      user_id: userId,
      starting_balance: 100000,
      current_balance: 100000,
      is_active: true,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Failed to create paper trading session:', error);
    throw new Error('Failed to create paper trading session');
  }
  
  return data as PaperTradingSession;
}

/**
 * Get user's active paper trading session
 */
export async function getPaperTradingSession(userId: string): Promise<PaperTradingSession | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('paper_trading_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No session found
      return null;
    }
    console.error('Failed to get paper trading session:', error);
    throw new Error('Failed to get paper trading session');
  }
  
  return data as PaperTradingSession;
}

/**
 * Execute a paper trade
 */
export async function executePaperTrade(
  userId: string,
  trade: Omit<PaperTrade, 'session_id'>
): Promise<{ success: boolean; new_balance: number; trade_id: string }> {
  const supabase = await createClient();
  
  // Get current session
  const session = await getPaperTradingSession(userId);
  if (!session) {
    throw new Error('No active paper trading session found');
  }
  
  const totalValue = trade.quantity * trade.price;
  
  // Validate balance for buy orders
  if (trade.side === 'buy' && session.current_balance < totalValue) {
    throw new Error('Insufficient balance for this trade');
  }
  
  // Calculate new balance
  const newBalance = trade.side === 'buy' 
    ? session.current_balance - totalValue
    : session.current_balance + totalValue;
  
  // Execute trade and update balance in a transaction-like manner
  const { data: tradeData, error: tradeError } = await supabase
    .from('paper_trades')
    .insert({
      session_id: session.id,
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      price: trade.price,
      total_value: totalValue,
    })
    .select()
    .single();
  
  if (tradeError) {
    console.error('Failed to execute trade:', tradeError);
    throw new Error('Failed to execute trade');
  }
  
  // Update session balance
  const { error: updateError } = await supabase
    .from('paper_trading_sessions')
    .update({
      current_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id);
  
  if (updateError) {
    console.error('Failed to update balance:', updateError);
    throw new Error('Failed to update balance');
  }
  
  return {
    success: true,
    new_balance: newBalance,
    trade_id: tradeData.id,
  };
}

/**
 * Get trade history for a session
 */
export async function getPaperTradeHistory(
  sessionId: string,
  limit: number = 50
): Promise<TradeHistoryItem[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('paper_trades')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Failed to get trade history:', error);
    throw new Error('Failed to get trade history');
  }
  
  return data as TradeHistoryItem[];
}

/**
 * Reset paper trading session
 */
export async function resetPaperTradingSession(sessionId: string): Promise<void> {
  const supabase = await createClient();
  
  // Delete all trades for this session
  const { error: deleteError } = await supabase
    .from('paper_trades')
    .delete()
    .eq('session_id', sessionId);
  
  if (deleteError) {
    console.error('Failed to delete trades:', deleteError);
    throw new Error('Failed to reset session');
  }
  
  // Reset balance
  const { error: updateError } = await supabase
    .from('paper_trading_sessions')
    .update({
      current_balance: 100000,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
  
  if (updateError) {
    console.error('Failed to reset balance:', updateError);
    throw new Error('Failed to reset session');
  }
}

/**
 * Get or create paper trading session (auto-initialization)
 */
export async function getOrCreatePaperTradingSession(userId: string): Promise<PaperTradingSession> {
  const existing = await getPaperTradingSession(userId);
  if (existing) {
    return existing;
  }
  return createPaperTradingSession(userId);
}

/**
 * Calculate P&L for a session
 */
export function calculatePnL(session: PaperTradingSession): {
  absolute: number;
  percentage: number;
  isPositive: boolean;
} {
  const absolute = session.current_balance - session.starting_balance;
  const percentage = (absolute / session.starting_balance) * 100;
  
  return {
    absolute,
    percentage,
    isPositive: absolute >= 0,
  };
}
