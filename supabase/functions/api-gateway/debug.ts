import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("Authorization");
  const envToken = Deno.env.get('API_GATEWAY_TOKEN') || 'NOT_SET';
  
  // Debug info
  const debug = {
    received_auth: authHeader,
    expected_prefix: "Bearer ",
    env_token_exists: envToken !== 'NOT_SET',
    env_token_preview: envToken !== 'NOT_SET' ? envToken.substring(0, 10) + '...' : 'NOT_SET',
    match: authHeader === `Bearer ${envToken}`,
    timestamp: new Date().toISOString(),
  };

  // Sjekk auth
  if (authHeader !== `Bearer ${envToken}`) {
    return new Response(JSON.stringify({
      error: "Invalid JWT",
      debug: debug,
      hint: "Sjekk at API_GATEWAY_TOKEN er satt riktig i Supabase secrets"
    }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({
    status: "ok",
    message: "Debug: Auth fungerer!",
    debug: debug
  }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
});
