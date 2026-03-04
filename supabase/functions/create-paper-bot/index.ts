import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRATEGY_CONFIG: Record<string, { name: string; pair: string; interval: string }> = {
  trend: { name: "Trend Trading", pair: "BTC/USDT", interval: "1h" },
  dca: { name: "DCA Strategy", pair: "BTC/USDT", interval: "4h" },
  grid: { name: "Grid Trading", pair: "ETH/USDT", interval: "30m" },
  breakout: { name: "Breakout", pair: "BTC/USDT", interval: "15m" },
  ai: { name: "AI Optimized", pair: "BTC/USDT", interval: "1h" },
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Autentiser med service role for å skrive til bots-tabellen
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verifiser at kallet kommer fra en autentisert bruker
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Ikke autentisert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hent bruker fra JWT
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Ugyldig token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { strategy_id } = await req.json() as { strategy_id: string; user_id: string };

    if (!strategy_id || !STRATEGY_CONFIG[strategy_id]) {
      return new Response(JSON.stringify({ error: "Ugyldig strategy_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = STRATEGY_CONFIG[strategy_id];

    // Sjekk om bruker allerede har en aktiv paper bot for denne strategien
    const { data: existingBot } = await supabaseAdmin
      .from("bots")
      .select("id")
      .eq("user_id", user.id)
      .eq("strategy_id", strategy_id)
      .eq("mode", "paper")
      .eq("is_active", true)
      .maybeSingle();

    if (existingBot) {
      // Returner eksisterende bot i stedet for å opprette duplikat
      return new Response(
        JSON.stringify({ bot_id: existingBot.id, created: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Opprett ny paper bot
    const { data: newBot, error: insertError } = await supabaseAdmin
      .from("bots")
      .insert({
        user_id: user.id,
        name: `${config.name} (Paper)`,
        strategy_id,
        trading_pair: config.pair,
        interval: config.interval,
        mode: "paper",
        is_active: true,
        paper_balance: 10000, // Standard startsaldo: 10 000 USDT
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !newBot) {
      console.error("Feil ved opprettelse av paper bot:", insertError);
      return new Response(
        JSON.stringify({ error: "Klarte ikke opprette paper bot", details: insertError?.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ bot_id: newBot.id, created: true, strategy: config.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Uventet feil:", err);
    return new Response(
      JSON.stringify({ error: "Intern serverfeil" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
