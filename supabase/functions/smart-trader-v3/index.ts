/**
 * SmartTrader v3 — Supabase Edge Function
 *
 * Teknisk analyse-bot som kjører hvert 15. minutt via pg_cron.
 * 
 * V3.1 FORBEDRINGER:
 * - Maks 50 trades per session (hindrer overbelastning)
 * - Valider Binance for session starter
 * - Spre kjøringer jevnt over 15 min
 * - Logg error_message ved feil
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { evaluateSignal } from "./signals.ts";
import { executeTrade, checkAndClosePosition } from "./executor.ts";
import { DEFAULT_CONFIG } from "./types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const MAX_TRADES_PER_SESSION = 50; // Hindrer overbelastning
const BINANCE_TIMEOUT_MS = 8000;   // Timeout for Binance-validering

serve(async (req) => {
  const startTime = Date.now();

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // === FIX 3: Valider Binance for sessions startes ===
    const binanceOk = await validateBinance();
    if (!binanceOk) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Binance API utilgjengelig — venter til neste intervall",
      }), { status: 503, headers: { "Content-Type": "application/json" } });
    }

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

    // === FIX 2+4: Sjekk trades count + spre jevnt ===
    const results: Record<string, unknown>[] = [];
    const delayBetween = Math.min(3000, Math.floor(60000 / sessions.length)); // Spre over intervallet

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];

      try {
        // === FIX 2: Sjekk antall trades — maks 50 ===
        const { count: tradeCount, error: countError } = await supabase
          .from("trades")
          .select("*", { count: "exact", head: true })
          .eq("session_id", session.id);

        if (countError || (tradeCount && tradeCount >= MAX_TRADES_PER_SESSION)) {
          results.push({
            session: session.id,
            status: "skipped",
            reason: `${tradeCount || "?"} trades (maks ${MAX_TRADES_PER_SESSION})`,
          });
          continue;
        }

        const config = {
          ...DEFAULT_CONFIG,
          ...(session.smart_trader_config || {}),
          symbol: session.trading_pair || DEFAULT_CONFIG.symbol,
        };

        const klines = await fetchKlines(config.symbol, config.interval);
        if (!klines || klines.length < config.rsiPeriod + 5) {
          results.push({ session: session.id, status: "skipped", reason: "For få klines-data" });
          continue;
        }

        const currentPrice = klines[klines.length - 1].close;

        if (session.open_position) {
          const exitResult = await checkAndClosePosition(supabase, session, currentPrice, config);
          if (exitResult.closed) {
            results.push({ session: session.id, status: exitResult.reason, price: currentPrice });
            continue;
          }
        }

        const signal = evaluateSignal(klines, config);
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
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[SmartTrader] Session ${session.id} error:`, errMsg);

        // === FIX 1: Logg error_message til DB ===
        await supabase
          .from("trading_sessions")
          .update({
            error_message: errMsg.substring(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.id);

        results.push({ session: session.id, status: "error", error: errMsg });
      }

      // === FIX 4: Spre kjøringer jevnt over intervallet ===
      if (i < sessions.length - 1) {
        await new Promise(r => setTimeout(r, delayBetween));
      }
    }

    const duration = Date.now() - startTime;
    return new Response(JSON.stringify({ ok: true, processed: sessions.length, results, duration_ms: duration }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[SmartTrader] FATAL:", errMsg);
    return new Response(JSON.stringify({ ok: false, error: errMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/**
 * FIX 3: Valider at Binance API er tilgjengelig for trading startes
 */
async function validateBinance(): Promise<boolean> {
  const endpoints = [
    "https://api.binance.com/api/v3/ping",
    "https://data-api.binance.vision/api/v3/ping",
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(BINANCE_TIMEOUT_MS) });
      if (res.ok) return true;
    } catch { continue; }
  }
  return false;
}

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
    } catch { continue; }
  }
  throw new Error("Alle Binance-endepunkter feilet");
}
