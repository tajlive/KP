/**
 * Ensemble Signals Edge Function
 * KLA-PROFIT1: Low-latency signal feed
 *
 * Returns the latest pre-computed ensemble signals from ai_decision_log.
 * Optionally accepts ?symbol=BTCUSDT to filter.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol");

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let query = supabase
      .from("ai_decision_log")
      .select("symbol, decision_type, sentiment_score, analysis_data, decision_reason, executed_at")
      .eq("analysis_data->ensemble", true)
      .order("executed_at", { ascending: false })
      .limit(20);

    if (symbol) {
      query = query.eq("symbol", symbol.toUpperCase());
    }

    const { data, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signals = (data || []).map((row: any) => ({
      symbol: row.symbol,
      action: row.decision_type,
      confidence: row.sentiment_score ?? 0,
      reasoning: row.decision_reason ?? "",
      scores: row.analysis_data?.scores || {},
      indicators: row.analysis_data?.indicators || {},
      sizing: row.analysis_data?.sizing || {},
      timestamp: row.executed_at,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        count: signals.length,
        signals,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
