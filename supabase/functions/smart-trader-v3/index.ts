/**
 * SmartTrader v3 — Supabase Edge Function
 *
 * Teknisk analyse-bot som kjører hvert 15. minutt via pg_cron.
 * 
 * V3.1 FORBEDRINGER:
 * - Maks 50 trades per session (hindrer overbelastning)
 * - Valider Binance før session starter
 * - Spre kjøringer jevnt over 15 min
 * - Logg error_message ved feil
 * 
 * V3.2 FORBEDRINGER (2026-07-30):
 * - Valuta-konvertering USDT → NOK i executor (paper-kapital er NOK).
 * - Posisjon lagrer symbol; selg/SL/TP validerer at posisjonen tilhører
 *   samme par som session.trading_pair.
 * - Harde tak på trade-verdi for å hindre inflasjon.
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

    // === FIX 3: Valider Binance før sessions startes ===
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

    // Hent klines én gang per unikt symbol (99 % av sessions bruker samme par)
    const klinesCache = new Map<string, { close: number; high: number; low: number }[]>();
    const priceCache = new Map<string, number>();

    for (const session of sessions) {
      const symbol = session.trading_pair || DEFAULT_CONFIG.symbol;
      if (!klinesCache.has(symbol)) {
        try {
          const klines = await fetchKlines(symbol, DEFAULT_CONFIG.interval);
          klinesCache.set(symbol, klines);
          priceCache.set(symbol, klines[klines.length - 1].close);
        } catch (err) {
          klinesCache.set(symbol, []);
        }
      }
    }

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];

      try {
        const config = {
          ...DEFAULT_CONFIG,
          ...(session.smart_trader_config || {}),
          symbol: session.trading_pair || DEFAULT_CONFIG.symbol,
        };

        const klines = klinesCache.get(config.symbol) || [];
        if (klines.length < config.rsiPeriod + 5) {
          results.push({ session: session.id, status: "skipped", reason: "For få klines-data" });
          continue;
        }
        const currentPrice = priceCache.get(config.symbol)!;

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

      // === FIX 4: Minimal delay for å ikke overbelaste DB/Rate limits ===
      if (i < sessions.length - 1) {
        await new Promise(r => setTimeout(r, 50));
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
 * FIX 3: Valider at Binance API er tilgjengelig før trading startes
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
