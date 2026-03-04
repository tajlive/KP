import { createClient } from '@supabase/supabase-js';

// Risk Engine
const RISK_PROFILES = {
  conservative: { maxPositionPercent: 1.00, dailyLossLimit: 3.00, dailyTradeLimit: 5 },
  moderate: { maxPositionPercent: 2.00, dailyLossLimit: 5.00, dailyTradeLimit: 10 },
  aggressive: { maxPositionPercent: 5.00, dailyLossLimit: 10.00, dailyTradeLimit: 20 }
};

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
    const { signalId, symbol, side, price, stopLoss, takeProfit, confidence } = body;
    
    if (!signalId || !symbol || !side || !price) {
      return new Response(
        JSON.stringify({ error: 'Manglende påkrevde felt' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
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
    
    // 1. Hent brukerens settings
    const { data: settings, error: settingsError } = await supabase
      .from('auto_trade_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: 'Finner ikke auto-trade innstillinger' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 2. Sjekk om auto-trading er aktivert
    if (!settings.auto_trading_enabled) {
      return new Response(
        JSON.stringify({ 
          error: 'AUTO_TRADING_DISABLED',
          message: 'Auto-trading er ikke aktivert. Gå til innstillinger for å slå det på.'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 3. Sjekk confidence
    if (confidence && confidence < settings.min_confidence) {
      return new Response(
        JSON.stringify({ 
          error: 'INSUFFICIENT_CONFIDENCE',
          message: `Signal confidence (${confidence}%) er under minimum (${settings.min_confidence}%)`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 4. Sjekk symbol whitelist
    if (settings.allowed_symbols && settings.allowed_symbols.length > 0) {
      const baseSymbol = symbol.replace('USDT', '').replace('BUSD', '');
      if (!settings.allowed_symbols.includes(baseSymbol)) {
        return new Response(
          JSON.stringify({ 
            error: 'SYMBOL_NOT_ALLOWED',
            message: `${symbol} er ikke i listen over tillatte symboler`
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // 5. Hent API-nøkler
    const { data: apiKeys, error: apiError } = await supabase
      .from('trading_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .eq('exchange', 'binance')
      .eq('is_active', true)
      .single();
    
    if (apiError || !apiKeys) {
      return new Response(
        JSON.stringify({ 
          error: 'API_KEYS_NOT_FOUND',
          message: 'Ingen aktive API-nøkler funnet. Koble til Binance først.'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 6. Hent dagens stats
    const today = new Date().toISOString().split('T')[0];
    const { data: dailyStats, error: statsError } = await supabase
      .from('auto_trade_daily_stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();
    
    const stats = dailyStats || {
      total_trades: 0,
      total_realized_loss: 0
    };
    
    // 7. Sjekk daglig trade-limit
    if (stats.total_trades >= settings.daily_trade_limit) {
      return new Response(
        JSON.stringify({ 
          error: 'DAILY_TRADE_LIMIT_REACHED',
          message: `Daglig trade-limit nådd (${stats.total_trades}/${settings.daily_trade_limit}). Prøv igjen i morgen.`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 8. Hent porteføljeverdi (simplified - bør hentes fra Binance)
    // For nå bruker vi en standardverdi - i produksjon bør dette hentes fra Binance API
    const portfolioValue = 10000; // USDT - bør hentes fra Binance
    
    // 9. Sjekk daglig tapstak
    const dailyLossPercent = Math.abs(stats.total_realized_loss) / portfolioValue * 100;
    if (dailyLossPercent >= settings.daily_loss_limit_percent) {
      return new Response(
        JSON.stringify({ 
          error: 'DAILY_LOSS_LIMIT_REACHED',
          message: `Daglig tapstak nådd (${dailyLossPercent.toFixed(2)}/${settings.daily_loss_limit_percent}%). Auto-trading stoppet for i dag.`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 10. Sjekk concurrent positions
    const { count: openPositions, error: countError } = await supabase
      .from('auto_trades')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'open');
    
    if (openPositions >= settings.max_concurrent_positions) {
      return new Response(
        JSON.stringify({ 
          error: 'MAX_POSITIONS_REACHED',
          message: `Maks antall åpne posisjoner nådd (${openPositions}/${settings.max_concurrent_positions})`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 11. Beregn posisjonsstørrelse
    const maxOrderValue = portfolioValue * (settings.max_position_percent / 100);
    
    // Sjekk minimumsordre
    if (maxOrderValue < settings.min_order_size_usdt) {
      return new Response(
        JSON.stringify({ 
          error: 'POSITION_TOO_SMALL',
          message: `Posisjonsstørrelse (${maxOrderValue.toFixed(2)} USDT) er under minimum (${settings.min_order_size_usdt} USDT)`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Beregn quantity
    const quantity = maxOrderValue / price;
    
    // 12. Dekrypter API-nøkler
    // MERK: Dette er en simplified versjon. I produksjon bør du ha en sikker KMS.
    // For nå returnerer vi en "simulated" respons siden vi ikke har ekte kryptering i Cloudflare
    
    // 13. Lagre trade i database (simulert for nå)
    const { data: trade, error: tradeError } = await supabase
      .from('auto_trades')
      .insert({
        user_id: user.id,
        signal_id: signalId,
        symbol: symbol,
        side: side,
        quantity: quantity.toFixed(8),
        entry_price: price,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        status: 'pending',
        risk_profile_used: settings.risk_profile,
        max_position_percent_used: settings.max_position_percent
      })
      .select()
      .single();
    
    if (tradeError) throw tradeError;
    
    // 14. Oppdater daily stats
    await supabase.rpc('upsert_daily_stats', {
      p_user_id: user.id,
      p_trade_pnl: 0
    });
    
    // MERK: Her bør du kalle Binance API for å faktisk utføre trade
    // Dette krever implementasjon av Binance API integrasjon
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          tradeId: trade.id,
          status: 'pending',
          message: `Auto-trade registrert: ${side} ${quantity.toFixed(8)} ${symbol} @ ${price} USDT`,
          riskProfileUsed: settings.risk_profile,
          positionSize: maxOrderValue
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Execute auto-trade error:', error);
    return new Response(
      JSON.stringify({ error: 'En feil oppstod', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
