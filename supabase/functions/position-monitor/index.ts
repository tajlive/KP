// Position Monitor Edge Function — Sprint 11
// Overvåker åpne paper-ordrer og trigger stop-loss / take-profit / trailing-stop
// Kjøres av pg_cron hvert minutt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { evaluatePositionExits } from '../_shared/risk-engine.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getCurrentPrice(symbol: string): Promise<number> {
  const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`)
  if (!res.ok) throw new Error(`Binance price HTTP ${res.status} for ${symbol}`)
  const data = await res.json()
  return parseFloat(data.price)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // KLA-214: Hent alle åpne trades fra unified trades-tabell
    const { data: positions, error } = await supabase
      .from('trades')
      .select('*')
      .eq('status', 'open')
      .eq('mode', 'paper')

    if (error) throw error

    let triggered = 0
    const closedResults: Array<{ order_id: string; symbol: string; reason: string; pnl_pct: number }> = []

    const symbols = [...new Set((positions ?? []).map((p: any) => p.trading_pair ?? 'BTCUSDT'))]
    const priceCache: Record<string, number> = {}
    for (const sym of symbols) {
      try {
        priceCache[sym] = await getCurrentPrice(sym)
      } catch (e) {
        console.error(`Kunne ikke hente pris for ${sym}:`, e)
      }
    }

    // 2. Fetch Active Regime (for Yield Hunger / Safety)
    const { data: regimeData } = await supabase
      .from('regime_cache' as any)
      .select('regime')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const currentRegime = (regimeData?.regime as any) || 'unclear';

    for (const pos of positions ?? []) {
      const sym = pos.trading_pair ?? 'BTCUSDT'
      const currentPrice = priceCache[sym]
      if (!currentPrice) continue

      const signal = pos.strategy_signal as Record<string, any> | null
      const metadata = pos.metadata || {};
      
      // ========================================================================
      // Tiered Take Profit Evaluation (Phase 3)
      // ========================================================================
      const tpTargets = metadata.tp_targets || [];
      if (tpTargets.length > 0) {
        const { shouldExit: hitTier, exitRatio, targetIndex } = evaluatePositionExits.evaluateTieredExits({
          currentPrice,
          entryPrice: parseFloat(pos.price),
          side: pos.side === 'BUY' ? 'long' : 'short',
          targets: tpTargets
        });

        if (hitTier && targetIndex !== null) {
          const partialQty = pos.quantity * exitRatio;
          const partialNok = pos.amount_nok * exitRatio;

          console.log(`[position-monitor] TIER HIT! Closing ${exitRatio * 100}% of ${pos.id} at ${currentPrice}`);

          // 1. Mark target as hit
          tpTargets[targetIndex].hit = true;
          
          // 2. Insert closed trade record for the partial exit
          await supabase.from('trades').insert({
            user_id: pos.user_id,
            strategy_id: pos.strategy_id,
            mode: pos.mode,
            symbol: sym,
            side: pos.side === 'BUY' ? 'sell' : 'buy',
            quantity: partialQty,
            amount_nok: partialNok,
            entry_price: parseFloat(pos.price),
            exit_price: currentPrice,
            status: 'closed',
            exit_reason: `Tiered TP ${targetIndex + 1}`,
            metadata: { parent_trade_id: pos.id, tier: targetIndex + 1 }
          });

          // 3. Update parent trade (reduce quantity)
          const newQty = pos.quantity - partialQty;
          const newNok = pos.amount_nok - partialNok;
          
          await supabase.from('trades').update({
            quantity: newQty,
            amount_nok: newNok,
            metadata: { ...metadata, tp_targets: tpTargets }
          }).eq('id', pos.id);

          triggered++;
          continue; // Move to next position (don't evaluate full exit yet)
        }
      }

      // ========================================================================
      // Standard Risk Engine Evaluation (SL / Full TP / Trailing)
      // ========================================================================
      const { shouldExit, reason: exitReason, pnlPercent } = evaluatePositionExits({
        side: pos.side === 'BUY' ? 'long' : 'short',
        entryPrice: parseFloat(pos.price),
        currentPrice: currentPrice,
        stopLoss: signal?.stop_loss ?? null,
        takeProfit: signal?.take_profit ?? null,
        trailingStop: signal?.trailing_stop ?? null,
        highestPrice: metadata.highest_price || parseFloat(pos.price),
        lowestPrice: metadata.lowest_price || parseFloat(pos.price),
      })

      if (!shouldExit) {
        // Update high/low watermark for trailing stop
        const newMetadata = {
          ...metadata,
          highest_price: Math.max(metadata.highest_price || parseFloat(pos.price), currentPrice),
          lowest_price: Math.min(metadata.lowest_price || parseFloat(pos.price), currentPrice),
        }
        
        await supabase.from('trades').update({ metadata: newMetadata }).eq('id', pos.id)
        continue
      }
      
      const pnlPct = pnlPercent

      try {
        await supabase
          .from('trades')
          .update({
            status: 'closed',
            realized_pnl: pnlPct,
            exit_price: currentPrice,
            closed_at: new Date().toISOString()
          })
          .eq('id', pos.id)

        await supabase.from('bot_health').insert({
          event_type: pnlPct >= 0 ? 'TRADE_CLOSED_PROFIT' : 'TRADE_CLOSED_LOSS',
          user_id: pos.user_id,
          message: exitReason,
          details: {
            order_id: pos.id,
            symbol: sym,
            pnl_pct: parseFloat(pnlPct.toFixed(2)),
            entry_price: parseFloat(pos.price),
            exit_price: currentPrice,
          },
        })

        // ========================================================================
        // Update Strategy Performance Stats (For Kelly sizing)
        // ========================================================================
        const { data: currentStats } = await supabase
          .from('strategy_performance' as any)
          .select('win_rate, avg_win_pct, avg_loss_pct, total_trades')
          .eq('user_id', pos.user_id)
          .eq('strategy_id', pos.strategy_id)
          .maybeSingle();

        const n = currentStats?.total_trades || 0;
        const oldWinRate = currentStats?.win_rate || 0.5;
        const newWinRate = pnlPct >= 0 
          ? (oldWinRate * n + 1) / (n + 1) 
          : (oldWinRate * n) / (n + 1);

        const oldAvgWin = currentStats?.avg_win_pct || 2.5;
        const oldAvgLoss = currentStats?.avg_loss_pct || 1.5;
        
        let newAvgWin = oldAvgWin;
        let newAvgLoss = oldAvgLoss;
        
        if (pnlPct >= 0) {
          const wins = Math.round(oldWinRate * n);
          newAvgWin = (oldAvgWin * wins + pnlPct) / (wins + 1);
        } else {
          const losses = n - Math.round(oldWinRate * n);
          newAvgLoss = (oldAvgLoss * losses + Math.abs(pnlPct)) / (losses + 1);
        }

        await supabase.from('strategy_performance' as any).upsert({
          user_id: pos.user_id,
          strategy_id: pos.strategy_id,
          win_rate: newWinRate,
          avg_win_pct: newAvgWin,
          avg_loss_pct: newAvgLoss,
          total_trades: n + 1,
          updated_at: new Date().toISOString()
        });

        // ========================================================================
        // Smart Yield Nudge (Phase 2)
        // ========================================================================
        if (currentRegime === 'bear' || currentRegime === 'high-vol') {
          await supabase.from('bot_health').insert({
            event_type: 'YIELD_HINT',
            user_id: pos.user_id,
            message: `Markedet er i ${currentRegime}-regime. Vurder Smart Yield for passiv rente mens du venter på bedre entry.`,
            details: {
              suggested_action: 'MOVE_TO_YIELD',
              current_regime: currentRegime,
              idle_capital_hint: true
            }
          });
        }

        triggered++
        closedResults.push({ order_id: pos.id, symbol: sym, reason: exitReason, pnl_pct: parseFloat(pnlPct.toFixed(2)) })
      } catch (closeErr) {
        console.error(`Feil ved lukking av posisjon ${pos.id}:`, closeErr)
      }
    }

    // Logg oppsummering
    await supabase.from('bot_health').insert({
      event_type: 'INFO',
      message: `Position monitor: ${positions?.length ?? 0} åpne posisjoner sjekket, ${triggered} lukket`,
      details: { positions_checked: positions?.length ?? 0, positions_closed: triggered },
    })

    return new Response(
      JSON.stringify({
        success: true,
        positions_checked: positions?.length ?? 0,
        positions_triggered: triggered,
        results: closedResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Position monitor error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
