// ============================================================================
// supabase/functions/process-copy-trades/index.ts
// COPY-TRADE QUEUE PROCESSOR
// ============================================================================
// Architecture Decision: Why Edge Function + Queue instead of direct DB trigger?
//
// Problem: A DB trigger that directly executes copy trades would:
// 1. Block the leader's transaction until all followers are processed
// 2. Fail atomically — if 1 follower fails, leader's trade rolls back
// 3. Hit Binance rate limits with synchronous calls
//
// Solution: Two-phase commit
// Phase 1 (DB trigger): Queue copy trades instantly (< 1ms per follower)
// Phase 2 (This Edge Function): Process queue async, with retries
//
// Trigger: pg_notify → Supabase webhook → This function
// Also: Runs every 30 seconds via cron as backup (if pg_notify misses)
// ============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BATCH_SIZE = 20; // Process 20 at a time to stay within rate limits
const MAX_RETRIES = 3;

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch pending copy trades
    const { data: pendingTrades, error } = await supabase
      .from('copy_trade_queue')
      .select(`
        *,
        copy_trading_follows!follow_id (scale_factor, max_trade_size),
        trades!leader_trade_id (trading_pair, side, quantity, price)
      `)
      .eq('status', 'pending')
      .lt('attempts', MAX_RETRIES)
      .order('created_at')
      .limit(BATCH_SIZE);

    if (error) {
      console.error('Failed to fetch pending trades:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!pendingTrades || pendingTrades.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
    }

    const results = [];

    for (const queueItem of pendingTrades) {
      try {
        // Mark as processing (prevents duplicate processing)
        await supabase
          .from('copy_trade_queue')
          .update({ status: 'processing', attempts: queueItem.attempts + 1 })
          .eq('id', queueItem.id)
          .eq('status', 'pending'); // Optimistic lock

        // Check if follower still has an active session
        const { data: followerSession } = await supabase
          .from('trading_sessions')
          .select('id, current_capital, mode')
          .eq('user_id', queueItem.follower_id)
          .eq('trading_pair', queueItem.trading_pair)
          .eq('status', 'active')
          .maybeSingle();

        if (!followerSession) {
          await supabase
            .from('copy_trade_queue')
            .update({ status: 'skipped', error_message: 'No active session for follower', processed_at: new Date().toISOString() })
            .eq('id', queueItem.id);
          results.push({ id: queueItem.id, status: 'skipped', reason: 'no_session' });
          continue;
        }

        // Check if follower has enough capital (for buys)
        const totalValue = queueItem.quantity * queueItem.price;
        if (queueItem.side === 'buy' && totalValue > followerSession.current_capital) {
          // Scale down to what they can afford (partial fill)
          const affordableQuantity = (followerSession.current_capital * 0.95) / queueItem.price; // 95% to leave buffer
          
          if (affordableQuantity < 0.00000001) {
            await supabase
              .from('copy_trade_queue')
              .update({ status: 'skipped', error_message: 'Insufficient capital', processed_at: new Date().toISOString() })
              .eq('id', queueItem.id);
            results.push({ id: queueItem.id, status: 'skipped', reason: 'insufficient_capital' });
            continue;
          }
          
          // Use scaled down quantity
          queueItem.quantity = affordableQuantity;
        }

        // Generate idempotency key for the follower's trade
        const idempotencyKey = `copy-${queueItem.leader_trade_id}-${queueItem.follower_id}`;

        // Execute the follower's trade
        // For live mode: call Binance API here
        // For paper mode: just insert into trades table
        
        let binanceOrderId: string | null = null;
        
        if (followerSession.mode === 'live') {
          // TODO: Execute on Binance with follower's API keys
          // For now, skip live copy-trading (paper only in MVP)
          await supabase
            .from('copy_trade_queue')
            .update({ status: 'skipped', error_message: 'Live copy-trading not yet implemented', processed_at: new Date().toISOString() })
            .eq('id', queueItem.id);
          results.push({ id: queueItem.id, status: 'skipped', reason: 'live_not_implemented' });
          continue;
        }

        // Calculate realized PnL for sells
        let realizedPnl: number | null = null;
        if (queueItem.side === 'sell') {
          const { data: session } = await supabase
            .from('trading_sessions')
            .select('open_position')
            .eq('id', followerSession.id)
            .single();
          
          if (session?.open_position) {
            const entryPrice = (session.open_position as { entry_price: number }).entry_price;
            realizedPnl = (queueItem.price - entryPrice) * queueItem.quantity;
          }
        }

        // Insert the copy trade (triggers session state update + notification)
        const { data: trade, error: tradeError } = await supabase
          .from('trades')
          .insert({
            session_id: followerSession.id,
            user_id: queueItem.follower_id,
            idempotency_key: idempotencyKey,
            mode: followerSession.mode,
            trading_pair: queueItem.trading_pair,
            side: queueItem.side,
            order_type: 'market',
            quantity: queueItem.quantity,
            price: queueItem.price,
            total_value: queueItem.quantity * queueItem.price,
            fee: 0,
            status: 'filled',
            leader_trade_id: queueItem.leader_trade_id,
            is_copy: true,
            binance_order_id: binanceOrderId,
            realized_pnl: realizedPnl,
            strategy_signal: { copy_from: queueItem.leader_trade_id },
          })
          .select('id')
          .single();

        if (tradeError) {
          // Idempotency: trade already exists
          if (tradeError.code === '23505') {
            await supabase
              .from('copy_trade_queue')
              .update({ status: 'completed', processed_at: new Date().toISOString() })
              .eq('id', queueItem.id);
            results.push({ id: queueItem.id, status: 'completed', reason: 'already_exists' });
            continue;
          }
          throw tradeError;
        }

        // Update follow stats
        await supabase
          .from('copy_trading_follows')
          .update({
            total_copied_trades: queueItem.copy_trading_follows?.total_copied_trades + 1 ?? 1,
            total_pnl: (queueItem.copy_trading_follows?.total_pnl ?? 0) + (realizedPnl ?? 0),
            updated_at: new Date().toISOString(),
          })
          .eq('id', queueItem.follow_id);

        // Mark as completed
        await supabase
          .from('copy_trade_queue')
          .update({ status: 'completed', processed_at: new Date().toISOString() })
          .eq('id', queueItem.id);

        results.push({ id: queueItem.id, status: 'completed', trade_id: trade?.id });

      } catch (itemError) {
        console.error(`Failed to process copy trade ${queueItem.id}:`, itemError);
        
        const newStatus = queueItem.attempts + 1 >= MAX_RETRIES ? 'failed' : 'pending';
        await supabase
          .from('copy_trade_queue')
          .update({ 
            status: newStatus, 
            error_message: (itemError as Error).message,
            processed_at: newStatus === 'failed' ? new Date().toISOString() : null,
          })
          .eq('id', queueItem.id);

        results.push({ id: queueItem.id, status: newStatus, error: (itemError as Error).message });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Copy trade processor error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
