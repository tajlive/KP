// Position Monitor Edge Function — Sprint 11
// Overvåker åpne paper-ordrer og trigger stop-loss / take-profit
// Kjøres av pg_cron hvert minutt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Hent alle åpne paper-ordrer
    const { data: positions, error } = await supabase
      .from('paper_orders')
      .select('*')
      .eq('status', 'OPEN')

    if (error) throw error

    let triggered = 0
    const closedResults: Array<{ order_id: string; symbol: string; reason: string; pnl_pct: number }> = []

    // Grupper per symbol for å minimere Binance-kall
    const symbols = [...new Set((positions ?? []).map((p) => p.symbol ?? 'BTCUSDT'))]
    const priceCache: Record<string, number> = {}
    for (const sym of symbols) {
      try {
        priceCache[sym] = await getCurrentPrice(sym)
      } catch (e) {
        console.error(`Kunne ikke hente pris for ${sym}:`, e)
      }
    }

    for (const pos of positions ?? []) {
      const sym = pos.symbol ?? 'BTCUSDT'
      const currentPrice = priceCache[sym]
      if (!currentPrice) continue

      let shouldClose = false
      let closeReason = ''

      // ── Stop-loss sjekk ──
      if (pos.stop_loss != null) {
        if (pos.side === 'BUY' && currentPrice <= pos.stop_loss) {
          shouldClose = true
          closeReason = `STOP-LOSS: ${currentPrice.toFixed(2)} <= SL ${pos.stop_loss}`
        } else if (pos.side === 'SELL' && currentPrice >= pos.stop_loss) {
          shouldClose = true
          closeReason = `STOP-LOSS: ${currentPrice.toFixed(2)} >= SL ${pos.stop_loss}`
        }
      }

      // ── Take-profit sjekk ──
      if (!shouldClose && pos.take_profit != null) {
        if (pos.side === 'BUY' && currentPrice >= pos.take_profit) {
          shouldClose = true
          closeReason = `TAKE-PROFIT: ${currentPrice.toFixed(2)} >= TP ${pos.take_profit}`
        } else if (pos.side === 'SELL' && currentPrice <= pos.take_profit) {
          shouldClose = true
          closeReason = `TAKE-PROFIT: ${currentPrice.toFixed(2)} <= TP ${pos.take_profit}`
        }
      }

      if (!shouldClose) continue

      const entryPrice = parseFloat(pos.entry_price)
      const pnlPct =
        pos.side === 'BUY'
          ? ((currentPrice - entryPrice) / entryPrice) * 100
          : ((entryPrice - currentPrice) / entryPrice) * 100

      try {
        // Lukk posisjonen
        await supabase
          .from('paper_orders')
          .update({
            status: 'CLOSED',
            exit_price: currentPrice,
            exit_reason: closeReason,
            pnl_pct: pnlPct,
            closed_at: new Date().toISOString(),
          })
          .eq('id', pos.id)

        // Logg til trade_history
        await supabase.from('trade_history').insert({
          user_id: pos.user_id,
          strategy_type: pos.strategy_type ?? 'unknown',
          symbol: sym,
          side: pos.side,
          entry_price: entryPrice,
          exit_price: currentPrice,
          quantity: pos.quantity,
          pnl_pct: pnlPct,
          trading_mode: 'paper',
          exit_reason: closeReason,
          opened_at: pos.created_at,
          closed_at: new Date().toISOString(),
        })

        // Bot health-hendelse (trigger Web Push via Database Webhook)
        await supabase.from('bot_health').insert({
          event_type: pnlPct >= 0 ? 'TRADE_CLOSED_PROFIT' : 'TRADE_CLOSED_LOSS',
          user_id: pos.user_id,
          message: closeReason,
          details: {
            order_id: pos.id,
            symbol: sym,
            pnl_pct: parseFloat(pnlPct.toFixed(2)),
            entry_price: entryPrice,
            exit_price: currentPrice,
          },
        })

        triggered++
        closedResults.push({ order_id: pos.id, symbol: sym, reason: closeReason, pnl_pct: parseFloat(pnlPct.toFixed(2)) })
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
