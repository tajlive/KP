import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: CORS_HEADERS });

  // Token Validation
  const expectedToken = Deno.env.get("TAJ_CRON_TOKEN") || "";
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (authHeader !== `Bearer ${expectedToken}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: CORS_HEADERS,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Fetch recent trade activity
    const { data: recentTrades } = await supabaseClient
      .from("auto_trading_trades")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    // 2. Fetch current market context (simplified)
    const marketMood =
      recentTrades && recentTrades.length > 0 ? "Active" : "Stable";

    // 3. Generate AI Rationale (using Moonshot/DeepSeek via internal tool or direct API)
    // For now, mirroring the "Kimi Coaching" style
    const rationale = `Markedet viser ${marketMood === "Active" ? "tegn til bevegelse" : "stabilitet"}. Robotene dine har utført ${recentTrades?.length || 0} handler i dag basert på indikator-konvergens.`;

    // 4. Save to a notifications table or send via Resend (not implemented here)

    return new Response(
      JSON.stringify({
        status: "ok",
        job: "taj-market-alerts",
        rationale,
        trade_count: recentTrades?.length || 0,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
});
