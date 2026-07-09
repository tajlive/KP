/**
 * SmartTrader v3 — Supabase Edge Function
 *
 * Teknisk analyse-bot som kjører hvert 15. minutt via pg_cron.
 * Genererer kjøp/salg-signaler basert på RSI, SMA-crossover og momentum.
 * Kun paper mode — ingen live trading.
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { evaluateSignal } from "./signals.ts";
import { executeTrade, checkAndClosePosition } from "./executor.ts";
import { DEFAULT_CONFIG } from "./types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

serve(async (req) => {
  const startTime = Date.now();

  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  // Auth
  const auth = req.headers.get("Authorization") ?? "";
  const isCron = auth === `Bearer ${CRON_SECRET}`;
  const isAuthenticated = isCron;

  if (!isAuthenticated) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Hent aktive SmartTrader-sessions
    const { data: sessions, error: sessionError } = await supabase
      .from("trading_sessions")
      .select("*")
      .eq("smart_trader_enabled", true)
      .eq("status", "active")
      .eq("mode", "paper");

    if (sessionError) {
      throw new Error(`Session query failed: ${sessionError.message}`);
    }

    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, message: "Ingen aktive SmartTrader-sessions" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const results: Record<string, unknown>[] = [];

    for (const session of sessions) {
      try {
        const config = {
          ...DEFAULT_CONFIG,
          ...(session.smart_trader_config || {}),
          symbol: session.trading_pair || DEFAULT_CONFIG.symbol,
        };

        // Hent markedsdata via Binance proxy (direkte API for Edge Function)
        const klines = await fetchKlines(config.symbol, config.interval);
        if (!klines || klines.length < config.rsiPeriod + 5) {
          results.push({
            session: session.id,
            status: "skipped",
            reason: "For få klines-data",
          });
          continue;
        }

        const currentPrice = klines[klines.length - 1].close;

        // Sjekk åpen posisjon for SL/TP
        if (session.open_position) {
          const exitResult = await checkAndClosePosition(supabase, session, currentPrice, config);
          if (exitResult.closed) {
            results.push({
              session: session.id,
              status: exitResult.reason,
              price: currentPrice,
            });
            // Fortsett til neste session hvis posisjon ble lukket
            continue;
          }
        }

        // Evaluer signal
        const signal = evaluateSignal(klines, config);

        // Utfør trade
        const tradeResult = await executeTrade(supabase, session, signal, config, currentPrice);

        results.push({
          session: session.id,
          signal: signal.direction,
          confidence: signal.confidence,
          reasons: signal.reasons,
          executed: tradeResult.executed,
          rsi: signal.indicators.rsi,
          price: currentPrice,
        });
      } catch (err) {
        console.error(`[SmartTrader] Session ${session.id} error:`, err);
        results.push({
          session: session.id,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const duration = Date.now() - startTime;

    return new Response(JSON.stringify({
      ok: true,
      processed: sessions.length,
      results,
      duration_ms: duration,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[SmartTrader] FATAL:", err);
    return new Response(JSON.stringify({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/**
 * Hent klines-data direkte fra Binance (Edge Function har ikke IP-blokk).
 * Fallback til testnet hvis mainnet feiler.
 */
async function fetchKlines(symbol: string, interval: string): Promise<{ close: number; high: number; low: number }[]> {
  const endpoints = [
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=50`,
    `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=50`,
    `https://testnet.binance.vision/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=50`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      return data.map((k: unknown[]) => ({
        close: parseFloat(k[4] as string),
        high: parseFloat(k[2] as string),
        low: parseFloat(k[3] as string),
      }));
    } catch {
      continue;
    }
  }

  throw new Error("Alle Binance-endepunkter feilet");
}
