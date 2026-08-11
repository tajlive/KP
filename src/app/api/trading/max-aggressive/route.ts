/**
 * API: Max Aggressive — OKX live data for BestemorPanel.
 *
 * 2026-08-09 (P0, Tom-rapport): API-en leste USDT (Toms saldo er USDC → viste 0)
 * og brukte process.env.OKX_API_KEY (finnes ikke i CF Workers → stille feil).
 * Nå: nøkler hentes kryptert fra user_okx_keys (samme som motoren), saldo leses
 * som USDC med USDT-fallback, og svaret inkluderer begge valutaer eksplisitt.
 *
 * Auth: krever innlogget bruker (Supabase-sesjon). Returnerer KUN brukerens
 * egne OKX-data — aldri andres.
 *
 * @module api/trading/max-aggressive
 * @version 2.0.0
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decryptApiKey } from "@/lib/crypto/encrypt-api-keys";

export const runtime = "nodejs"; // @supabase/supabase-js krever process.version — krasjer i edge (500 i prod)

const OKX_BASE = "https://eea.okx.com";

interface OkxBalanceDetail {
  ccy?: string;
  availBal?: string;
  eq?: string;
}

interface OkxBalanceResponse {
  data?: Array<{ details?: OkxBalanceDetail[] }>;
}

interface OkxPosition {
  instId?: string;
  pos?: string;
  upl?: string;
  uplRatio?: string;
  liqPx?: string;
  lever?: string;
}

interface OkxPositionsResponse {
  data?: OkxPosition[];
}

async function okxSign(
  secret: string,
  timestamp: string,
  method: string,
  path: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(timestamp + method + path),
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function okxGet<T>(
  path: string,
  creds: { apiKey: string; apiSecret: string; passphrase: string },
): Promise<T> {
  const timestamp = new Date().toISOString();
  const sign = await okxSign(creds.apiSecret, timestamp, "GET", path);
  const res = await fetch(`${OKX_BASE}${path}`, {
    headers: {
      "OK-ACCESS-KEY": creds.apiKey,
      "OK-ACCESS-SIGN": sign,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": creds.passphrase,
    },
  });
  return res.json() as Promise<T>;
}

export async function GET(req: Request) {
  try {
    // 1. Autentiser bruker fra Supabase-sesjonscookie
    const authHeader = req.headers.get("authorization");
    const cookieHeader = req.headers.get("cookie") ?? "";

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Hent user_id fra sesjonscookien (sb-<ref>-auth-token).
    // Supabase kan chunke store cookies: sb-...-auth-token.0, .1, ...
    let userId: string | null = null;
    const cookieMap = new Map<string, string>();
    for (const part of cookieHeader.split(";")) {
      const eq = part.indexOf("=");
      if (eq > 0) {
        cookieMap.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
      }
    }

    // Finn base-navnet (sb-<ref>-auth-token) og slå sammen chunks
    let sessionRaw: string | null = null;
    for (const key of cookieMap.keys()) {
      if (/^sb-[a-z]+-auth-token$/.test(key)) {
        sessionRaw = cookieMap.get(key) ?? null;
        break;
      }
    }
    if (!sessionRaw) {
      // Chunked: .0, .1, ... i rekkefølge
      const chunks: string[] = [];
      for (let i = 0; i < 10; i++) {
        let found: string | undefined;
        for (const [key, val] of cookieMap) {
          if (key.endsWith(`-auth-token.${i}`)) {
            found = val;
            break;
          }
        }
        if (found === undefined) break;
        chunks.push(found);
      }
      if (chunks.length > 0) sessionRaw = chunks.join("");
    }

    if (sessionRaw) {
      try {
        const session = JSON.parse(decodeURIComponent(sessionRaw));
        userId = session?.user?.id ?? null;
      } catch {
        // Ugyldig cookie-format — prøv bearer-token i stedet
      }
    }
    if (!userId && authHeader?.startsWith("Bearer ")) {
      const {
        data: { user },
      } = await supabase.auth.getUser(authHeader.slice(7));
      userId = user?.id ?? null;
    }

    if (!userId) {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }

    // 2. Hent brukerens krypterte OKX-nøkler (samme som motoren bruker)
    const { data: okxRow } = await supabase
      .from("user_okx_keys")
      .select("api_key_encrypted, api_secret_encrypted, passphrase_encrypted")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (!okxRow) {
      return NextResponse.json(
        { error: "Ingen OKX-tilkobling", connected: false },
        { status: 200 },
      );
    }

    const creds = {
      apiKey: await decryptApiKey(okxRow.api_key_encrypted),
      apiSecret: await decryptApiKey(okxRow.api_secret_encrypted),
      passphrase: await decryptApiKey(okxRow.passphrase_encrypted),
    };

    // 3. Hent balanse + posisjoner parallelt
    const [balanceData, positionsData] = await Promise.all([
      okxGet<OkxBalanceResponse>("/api/v5/account/balance", creds),
      okxGet<OkxPositionsResponse>("/api/v5/account/positions", creds),
    ]);

    const details = balanceData.data?.[0]?.details ?? [];
    const findCcy = (ccy: string) =>
      details.find((d) => d.ccy === ccy)?.availBal ?? null;

    // Tom: EU-konto er USDC-denominert. USDT-fallback for andre.
    const usdc = findCcy("USDC");
    const usdt = findCcy("USDT");
    const balance = parseFloat(usdc ?? usdt ?? "0");
    const quoteCcy = usdc != null ? "USDC" : "USDT";

    const position = positionsData.data?.find((p) => p.pos && p.pos !== "0");
    const dailyPnl = position?.upl ? parseFloat(position.upl) : 0;
    const dailyPnlPct = position?.uplRatio
      ? parseFloat(position.uplRatio) * 100
      : 0;

    return NextResponse.json({
      connected: true,
      balance,
      quoteCcy,
      balanceNok: Math.round(balance * 9.6 * 100) / 100,
      dailyPnl,
      dailyPnlPct,
      position: position
        ? {
            symbol: position.instId,
            size: position.pos,
            leverage: position.lever,
            liqPrice: position.liqPx,
          }
        : null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[max-aggressive] error:", (err as Error).message);
    return NextResponse.json(
      { error: "Kunne ikke hente OKX-data" },
      { status: 500 },
    );
  }
}
