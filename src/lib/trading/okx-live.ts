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
 */
export async function getOkxLiveBalance(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<OkxLiveData> {
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

    return {
      connected: true,
      balanceUsdc,
      balanceNok: Math.round(balanceUsdc * rate * 100) / 100,
      quoteCcy,
      dailyPnl,
      dailyPnlPct,
      position: position
        ? {
            symbol: position.instId ?? "?",
            size: position.pos ?? "0",
            leverage: position.lever ?? "?",
            liqPrice: position.liqPx ?? "?",
          }
        : null,
    };
  } catch (err) {
    console.error("[getOkxLiveBalance] error:", (err as Error).message);
    return {
      connected: false,
      balanceUsdc: 0,
      balanceNok: 0,
      quoteCcy: "USDC",
      dailyPnl: 0,
      dailyPnlPct: 0,
      position: null,
    };
  }
}
