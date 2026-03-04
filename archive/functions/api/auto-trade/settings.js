import { createClient } from '@supabase/supabase-js';

// Hent settings
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    
    // Verifiser autentisering
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Uautorisert' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.substring(7);
    
    // Initialize Supabase
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Verifiser token og hent bruker
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Ugyldig token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Hent brukerens settings
    const { data: settings, error } = await supabase
      .from('auto_trade_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    // Hvis ingen settings finnes, opprett default
    if (!settings) {
      const { data: newSettings, error: createError } = await supabase
        .from('auto_trade_settings')
        .insert({ user_id: user.id })
        .select()
        .single();
      
      if (createError) throw createError;
      
      return new Response(
        JSON.stringify({ success: true, data: newSettings }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, data: settings }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Get settings error:', error);
    return new Response(
      JSON.stringify({ error: 'En feil oppstod', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Oppdater settings
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // Verifiser autentisering
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Uautorisert' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.substring(7);
    
    // Parse body
    const body = await request.json();
    
    // Initialize Supabase
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Verifiser token og hent bruker
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Ugyldig token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Valider input
    const validRiskProfiles = ['conservative', 'moderate', 'aggressive'];
    const riskProfileMap = {
      conservative: 1.00,
      moderate: 2.00,
      aggressive: 5.00
    };
    
    const updates = {};
    
    if (body.autoTradingEnabled !== undefined) {
      updates.auto_trading_enabled = body.autoTradingEnabled;
    }
    
    if (body.riskProfile !== undefined) {
      if (!validRiskProfiles.includes(body.riskProfile)) {
        return new Response(
          JSON.stringify({ error: 'Ugyldig risikoprofil' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      updates.risk_profile = body.riskProfile;
      updates.max_position_percent = riskProfileMap[body.riskProfile];
    }
    
    if (body.dailyLossLimitPercent !== undefined) {
      const limit = parseFloat(body.dailyLossLimitPercent);
      if (limit < 1 || limit > 50) {
        return new Response(
          JSON.stringify({ error: 'Daglig tapstak må være mellom 1% og 50%' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      updates.daily_loss_limit_percent = limit;
    }
    
    if (body.dailyTradeLimit !== undefined) {
      const limit = parseInt(body.dailyTradeLimit);
      if (limit < 1 || limit > 100) {
        return new Response(
          JSON.stringify({ error: 'Daglig trade-limit må være mellom 1 og 100' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      updates.daily_trade_limit = limit;
    }
    
    if (body.minConfidence !== undefined) {
      const conf = parseInt(body.minConfidence);
      if (conf < 0 || conf > 100) {
        return new Response(
          JSON.stringify({ error: 'Confidence må være mellom 0 og 100' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      updates.min_confidence = conf;
    }
    
    if (body.allowedSymbols !== undefined) {
      updates.allowed_symbols = body.allowedSymbols;
    }
    
    if (body.maxConcurrentPositions !== undefined) {
      updates.max_concurrent_positions = parseInt(body.maxConcurrentPositions);
    }
    
    if (body.minOrderSizeUsdt !== undefined) {
      updates.min_order_size_usdt = parseFloat(body.minOrderSizeUsdt);
    }
    
    updates.updated_at = new Date().toISOString();
    
    // Oppdater eller opprett settings
    const { data, error } = await supabase
      .from('auto_trade_settings')
      .upsert({
        user_id: user.id,
        ...updates
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return new Response(
      JSON.stringify({ success: true, data, message: 'Innstillinger oppdatert' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Update settings error:', error);
    return new Response(
      JSON.stringify({ error: 'En feil oppstod', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
