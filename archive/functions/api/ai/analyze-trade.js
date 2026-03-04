import { createClient } from '@supabase/supabase-js'

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    // 1. Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 2. Parse request
    const body = await request.json()
    const { trade, locale = 'no', userLevel = 'beginner' } = body

    if (!trade?.symbol || !trade?.side || !trade?.amount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 3. Get user context
    const { data: portfolio } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const { data: history } = await supabase
      .from('auto_trades')
      .select('*')
      .eq('user_id', user.id)
      .order('executed_at', { ascending: false })
      .limit(10)

    // 4. Build Claude prompt
    const language = locale === 'no' ? 'Norwegian (bokmål)' : 'English'
    const prompt = `You are an expert trading mentor helping a ${userLevel} cryptocurrency trader.

TRADE REQUEST:
${trade.side === 'buy' ? 'Buy' : 'Sell'} ${trade.symbol} for ${trade.amount} NOK

USER'S PORTFOLIO:
Current value: ${portfolio?.current_value || 0} NOK
Available cash: ${portfolio?.cash_balance || 0} NOK

RECENT TRADES (last 10):
${JSON.stringify(history || [], null, 2)}

YOUR TASK:
1. Assess risk level: low / medium / high / extreme
2. Recommend: approve / caution / block
3. Explain reasoning in ${language} (simple, educational)
4. If high risk, suggest safer alternatives
5. Provide 2-3 learning tips

RULES:
- Protect beginners from large losses
- Teach risk management
- Be honest about risks
- Never promise profits
- Use ${language} language

RESPONSE (JSON only, no other text):
{
  "recommendation": "approve" | "caution" | "block",
  "riskLevel": "low" | "medium" | "high" | "extreme",
  "reasoning": "Explanation in ${language}",
  "alternatives": [
    {
      "symbol": "...",
      "side": "buy" | "sell",
      "amount": 0,
      "reasoning": "Why safer"
    }
  ],
  "educationalTips": ["tip1", "tip2", "tip3"]
}
`

    // 5. Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error('Claude API error:', errorText)
      throw new Error('Claude API error: ' + errorText)
    }

    const claudeData = await claudeResponse.json()
    const analysisText = claudeData.content[0].text

    // Parse JSON from Claude response
    const analysis = JSON.parse(analysisText)

    // 6. Store analysis in database
    await supabase
      .from('ai_risk_analyses')
      .insert({
        user_id: user.id,
        trade_request: trade,
        risk_level: analysis.riskLevel,
        recommendation: analysis.recommendation,
        reasoning: analysis.reasoning,
        locale,
        alternatives: analysis.alternatives || null,
        educational_tips: analysis.educationalTips || []
      })

    // 7. Return analysis
    return new Response(JSON.stringify(analysis), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('AI analysis error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
