import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { trade_id } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: trade } = await supabase
      .from('trades')
      .select('*')
      .eq('id', trade_id)
      .single()

    if (!trade) {
      return new Response(JSON.stringify({ error: 'Trade not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: `Du er en norsk krypto-tradinglerer for Klarpakke.
Forklar handler enkelt på norsk. Maks 3 setninger.
Unngå fagspråk — bruk "automatisk brems" i stedet for "stop loss".
Vær oppmuntrende men ærlig om tap.`
        }, {
          role: 'user',
          content: `Forklar denne handelen for en nybegynner:
Par: ${trade.symbol}
Retning: ${trade.side}
Beløp: ${trade.amount} NOK
Strategi: ${trade.strategy_type}
Resultat: ${trade.pnl > 0 ? 'Gevinst' : 'Tap'} ${Math.abs(trade.pnl).toFixed(0)} NOK
Pris ved kjøp: ${trade.entry_price}
Pris nå: ${trade.current_price || trade.exit_price}`
        }],
        max_tokens: 200,
        temperature: 0.7
      })
    })

    const aiData = await response.json()

    return new Response(JSON.stringify({
      explanation: aiData.choices[0].message.content,
      trade_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
