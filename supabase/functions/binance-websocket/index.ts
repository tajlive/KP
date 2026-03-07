import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const TRACKED_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
  "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "DOTUSDT", "MATICUSDT"
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch current prices from Binance REST API (more reliable for edge function)
    const response = await fetch('https://api.binance.com/api/v3/ticker/24hr')
    const tickers = await response.json()

    const updates = tickers
      .filter((t: { symbol: string }) => TRACKED_SYMBOLS.includes(t.symbol))
      .map((t: {
        symbol: string;
        lastPrice: string;
        priceChangePercent: string;
        volume: string;
        highPrice: string;
        lowPrice: string;
      }) => ({
        symbol: t.symbol,
        name: t.symbol.replace('USDT', ''),
        price: parseFloat(t.lastPrice),
        price_change_percent_24h: parseFloat(t.priceChangePercent),
        volume_24h: parseFloat(t.volume),
        high_24h: parseFloat(t.highPrice),
        low_24h: parseFloat(t.lowPrice),
        last_updated: new Date().toISOString()
      }))

    // Upsert to coin_prices table
    const { error } = await supabase
      .from('coin_prices')
      .upsert(updates, { onConflict: 'symbol' })

    if (error) {
      console.error('Upsert error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      updated: updates.length,
      symbols: updates.map((u: { symbol: string }) => u.symbol)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
