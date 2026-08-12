/**
 * OKX Live Balance — shared helper for dashboard + max-aggressive.
 *
 * Henter OKX-saldo og posisjoner live fra OKX API (eea.okx.com).
 * Brukes av getUserDashboardMetrics (dashboard live-mode) og kan
 * gjenbrukes av /api/trading/max-aggressive.
 *
 * Graceful degradation: returnerer {connected: false} ved feil —
 * dashboard overlever OKX-nedetid uten å krasje.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { decryptApiKey } from "@/lib/crypto/encrypt-api-keys";
import { getUsdtToNokRateAsync } from "@/lib/trading/currency";

const OKX_BASE = "https://eea.okx.com";

interface OkxBalanceDetail {
  ccy?: string;
  availBal?: string;
  eq?: string;
}

interface OkxPosition {
  instId?: string;
  pos?: string;
  upl?: string;
  uplRatio?: string;
  liqPx?: string;
  lever?: string;
}

export interface OkxLiveData {
  connected: boolean;
  balanceUsdc: number;
  balanceNok: number;
  quoteCcy: string;
  dailyPnl: number;
  dailyPnlPct: number;
  /** Når dataen sist ble hentet (cache-skriv eller live-kall) */
  updatedAt: string | null;
  position: {
    symbol: string;
    size: string;
    leverage: string;
    liqPrice: string;
  } | null;
}

async function okxGet<T>(
  path: string,
  creds: { apiKey: string; apiSecret: string; passphrase: string },
): Promise<T> {
  const timestamp = new Date().toISOString();

  // HMAC-SHA256 signatur for OKX
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(creds.apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(timestamp + "GET" + path),
  );

  const res = await fetch(`${OKX_BASE}${path}`, {
    headers: {
      "OK-ACCESS-KEY": creds.apiKey,
      "OK-ACCESS-SIGN": btoa(String.fromCharCode(...new Uint8Array(signature))),
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": creds.passphrase,
    },
  });
  return res.json() as Promise<T>;
}

/**
 * Hent live OKX-data for en bruker. Returnerer alltid et objekt —
 * {connected: false} ved manglende nøkler eller API-feil.
 *
 * KLA-300 (2026-08-12): leser først fra okx_live_state (skrevet av
 * /api/cron/okx-balance-sync hvert 5. min). Kun ved tom rad eller
 * stale data (> 5 min) gjøres live API-kall — med skriv-tilbake til DB.
 * Dette gir: raskere dashboard, historikk og pålitelig dataalder.
 */
export async function getOkxLiveBalance(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<OkxLiveData> {
  // ── 1. Cache: okx_live_state (≤ 5 min) ────────────────────────────
  try {
    const { data: cached } = await supabase
      .from("okx_live_state")
      .select("snapshot, total_usdc, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (cached?.snapshot && cached.updated_at) {
      const ageMs = Date.now() - new Date(cached.updated_at).getTime();
      if (Number.isFinite(ageMs) && ageMs <= 5 * 60 * 1000) {
        const snap = cached.snapshot as {
          balanceUsdc?: number;
          balanceNok?: number;
          quoteCcy?: string;
          dailyPnl?: number;
          dailyPnlPct?: number;
          position?: OkxLiveData["position"];
        };
        return {
          connected: true,
          balanceUsdc: snap.balanceUsdc ?? (Number(cached.total_usdc) || 0),
          balanceNok: snap.balanceNok ?? 0,
          quoteCcy: snap.quoteCcy ?? "USDC",
          dailyPnl: snap.dailyPnl ?? 0,
          dailyPnlPct: snap.dailyPnlPct ?? 0,
          updatedAt: cached.updated_at,
          position: snap.position ?? null,
        };
      }
    }
  } catch (cacheErr) {
    // Cache-feil skal aldri krasje — fall tilbake til live API
    console.error(
      "[getOkxLiveBalance] cache read failed:",
      (cacheErr as Error).message,
    );
  }

  // ── 2. Live API-kall ──────────────────────────────────────────────
  try {
    const { data: okxRow } = await supabase
      .from("user_okx_keys")
      .select("api_key_encrypted, api_secret_encrypted, passphrase_encrypted")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (!okxRow) {
      return {
        connected: false,
        balanceUsdc: 0,
        balanceNok: 0,
        quoteCcy: "USDC",
        dailyPnl: 0,
        dailyPnlPct: 0,
        updatedAt: null,
        position: null,
      };
    }

    const creds = {
      apiKey: await decryptApiKey(okxRow.api_key_encrypted),
      apiSecret: await decryptApiKey(okxRow.api_secret_encrypted),
      passphrase: await decryptApiKey(okxRow.passphrase_encrypted),
    };

    // Hent balanse + posisjoner parallelt
    const [balanceData, positionsData] = await Promise.all([
      okxGet<{ data?: Array<{ details?: OkxBalanceDetail[] }> }>(
        "/api/v5/account/balance",
        creds,
      ),
      okxGet<{ data?: OkxPosition[] }>("/api/v5/account/positions", creds),
    ]);

    const details = balanceData.data?.[0]?.details ?? [];
    const findCcy = (ccy: string) =>
      details.find((d) => d.ccy === ccy)?.availBal ?? null;

    const usdc = findCcy("USDC");
    const usdt = findCcy("USDT");
    const balanceUsdc = parseFloat(usdc ?? usdt ?? "0");
    const quoteCcy = usdc != null ? "USDC" : "USDT";

    const position = positionsData.data?.find((p) => p.pos && p.pos !== "0");
    const dailyPnl = position?.upl ? parseFloat(position.upl) : 0;
    const dailyPnlPct = position?.uplRatio
      ? parseFloat(position.uplRatio) * 100
      : 0;

    const rate = await getUsdtToNokRateAsync(supabase);

    const result: OkxLiveData = {
      connected: true,
      balanceUsdc,
      balanceNok: Math.round(balanceUsdc * rate * 100) / 100,
      quoteCcy,
      dailyPnl,
      dailyPnlPct,
      updatedAt: new Date().toISOString(),
      position: position
        ? {
            symbol: position.instId ?? "?",
            size: position.pos ?? "0",
            leverage: position.lever ?? "?",
            liqPrice: position.liqPx ?? "?",
          }
        : null,
    };

    // ── 3. Skriv-tilbake til okx_live_state (cache for neste lesing) ──
    // Fire-and-forget: feil her skal ikke krasje dashboard-responsen.
    void supabase.from("okx_live_state").upsert(
      {
        user_id: userId,
        snapshot: {
          balanceUsdc: result.balanceUsdc,
          balanceNok: result.balanceNok,
          quoteCcy,
          dailyPnl,
          dailyPnlPct,
          position: result.position,
          fetchedAt: new Date().toISOString(),
        },
        total_usdc: Math.round(result.balanceUsdc * 100) / 100,
        total_nok: result.balanceNok,
        daily_pnl_usdc: dailyPnl,
        daily_pnl_pct: dailyPnlPct,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    return result;
  } catch (err) {
    console.error("[getOkxLiveBalance] error:", (err as Error).message);
    return {
      connected: false,
      balanceUsdc: 0,
      balanceNok: 0,
      quoteCcy: "USDC",
      dailyPnl: 0,
      dailyPnlPct: 0,
      updatedAt: null,
      position: null,
    };
  }
}
