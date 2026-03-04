// Cloudflare Pages Function - Connect to exchange API
export async function onRequestPost(context) {
  const { request, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { exchange, apiKey, apiSecret, userEmail } = body;
    
    if (!exchange || !apiKey || !apiSecret || !userEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Manglende parametere' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // TODO: I produksjon:
    // 1. Verifiser at brukeren finnes i beta_signups
    // 2. Krypter API-nøkkel med KMS
    // 3. Kall faktisk børs API (Binance, Coinbase, etc.)
    // 4. Lagre kryptert nøkkel i Supabase
    // 5. Returner faktisk saldo-data

    // For nå: Simuler suksess
    console.log(`Connecting ${userEmail} to ${exchange}`);
    
    // Simuler API-kall til børs
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock-respons
    const mockData = {
      success: true,
      exchange: exchange,
      connected: true,
      balance: 154320.50,
      currencies: [
        { symbol: 'BTC', amount: 0.045, valueNok: 125000, change24h: 2.3 },
        { symbol: 'ETH', amount: 1.2, valueNok: 25000, change24h: -0.5 },
        { symbol: 'USDT', amount: 4320.50, valueNok: 4320.50, change24h: 0 },
      ],
      lastUpdated: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(mockData),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Exchange connect error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
