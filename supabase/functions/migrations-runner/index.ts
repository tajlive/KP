/**
 * Supabase Migrations Runner
 * Kjører SQL migrasjoner via HTTP API
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_TOKEN = Deno.env.get("MIGRATIONS_ADMIN_TOKEN") || "klarpakke-dev-token";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
  
  try {
    const body = await req.json();
    
    // Auth
    if (body.token !== ADMIN_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
    
    // Connect with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );
    
    // Execute SQL
    const startTime = Date.now();
    const { data, error } = await supabase.rpc('exec_sql', { 
      query: body.sql 
    });
    
    const duration = Date.now() - startTime;
    
    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          duration: `${duration}ms`,
        }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "SQL executed successfully",
        duration: `${duration}ms`,
        result: data,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
