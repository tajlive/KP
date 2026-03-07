// Supabase Edge Function: Auto Trading
// Runs every 5 minutes via pg_cron

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

interface AutoTradingConfig {
  id: string;
  user_id: string;
  enabled: boolean;
  mode: 'paper' | 'live';
  risk_level: 'low' | 'medium' | 'high';
  max_trade_size_nok: number;
}

interface TradingSignal {
  id: string;
  symbol: string;
  action: 'buy' | 'sell';
  confidence: number;
  price: number;
  created_at: string;
}

Deno.serve(async (req) => {
  // Verify authorization
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Service role key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Simple auth check (cron jobs use service role)
  if (!authHeader?.includes(serviceRoleKey.substring(0, 10))) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const startTime = Date.now();
  const results = {
    totalUsers: 0,
    tradesExecuted: 0,
    errors: 0,
    details: [] as any[],
  };

  try {
    // Get all active auto traders
    const { data: activeTraders, error: tradersError } = await supabase
      .from('auto_trading_configs')
      .select('*')
      .eq('enabled', true);

    if (tradersError) throw tradersError;
    
    results.totalUsers = activeTraders?.length || 0;

    if (!activeTraders || activeTraders.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active traders',
          results 
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get recent trading signals from AI decision log
    const minConfidence = 60; // Base threshold
    const { data: signals, error: signalsError } = await supabase
      .from('ai_decision_log')
      .select('*')
      .in('decision_type', ['BUY', 'SELL'])
      .gte('confidence', minConfidence)
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 min
      .order('created_at', { ascending: false })
      .limit(20);

    if (signalsError) throw signalsError;

    if (!signals || signals.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No trading signals available',
          results 
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Process each trader
    for (const config of activeTraders as AutoTradingConfig[]) {
      try {
        // Get user's paper trading session
        const { data: session } = await supabase
          .from('paper_trading_sessions')
          .select('*')
          .eq('user_id', config.user_id)
          .eq('is_active', true)
          .single();

        if (!session && config.mode === 'paper') {
          // Create session if missing
          await supabase.from('paper_trading_sessions').insert({
            user_id: config.user_id,
            starting_balance: 100000,
            current_balance: 100000,
            is_active: true,
          });
          continue;
        }

        // Find best signal based on risk level
        const riskThresholds = {
          low: 80,
          medium: 70,
          high: 60,
        };
        
        const minConfidence = riskThresholds[config.risk_level];
        
        const validSignal = signals.find(s => 
          s.confidence >= minConfidence &&
          new Date(s.created_at).getTime() > Date.now() - 5 * 60 * 1000 // < 5 min old
        );

        if (!validSignal) continue;

        // Calculate trade size
        const confidenceMultiplier = validSignal.confidence / 100;
        const tradeValue = config.max_trade_size_nok * confidenceMultiplier;
        const quantity = tradeValue / validSignal.price;

        // Skip if below minimum
        if (tradeValue < 1000) continue;

        // Execute paper trade
        if (config.mode === 'paper' && session) {
          const totalValue = quantity * validSignal.price;
          
          // Check balance for buy orders
          if (validSignal.decision_type === 'BUY' && session.current_balance < totalValue) {
            continue;
          }

          const newBalance = validSignal.decision_type === 'BUY'
            ? session.current_balance - totalValue
            : session.current_balance + totalValue;

          // Insert trade
          const { error: tradeError } = await supabase
            .from('paper_trades')
            .insert({
              session_id: session.id,
              symbol: validSignal.symbol,
              side: validSignal.decision_type.toLowerCase(),
              quantity,
              price: validSignal.price,
              total_value: totalValue,
            });

          if (tradeError) throw tradeError;

          // Update balance
          await supabase
            .from('paper_trading_sessions')
            .update({
              current_balance: newBalance,
              updated_at: new Date().toISOString(),
            })
            .eq('id', session.id);

          results.tradesExecuted++;
          
          // Log the trade
          await supabase.from('auto_trade_log').insert({
            user_id: config.user_id,
            signal_id: validSignal.id,
            symbol: validSignal.symbol,
            action: validSignal.decision_type.toLowerCase(),
            confidence: validSignal.confidence,
            price: validSignal.price,
            mode: config.mode,
            success: true,
          });

          results.details.push({
            user_id: config.user_id,
            symbol: validSignal.symbol,
            action: validSignal.decision_type,
            confidence: validSignal.confidence,
            value: tradeValue,
          });
        }

        // Live trading would go here
        if (config.mode === 'live') {
          console.log(`Live trade skipped for user ${config.user_id} - not implemented`);
        }

      } catch (error) {
        console.error(`Error processing trader ${config.user_id}:`, error);
        results.errors++;
        
        await supabase.from('auto_trade_log').insert({
          user_id: config.user_id,
          mode: config.mode,
          success: false,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        results,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto trading cycle failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
