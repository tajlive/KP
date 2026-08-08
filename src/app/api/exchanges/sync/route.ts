import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServerClient } from "@/lib/supabase/server";
import { decryptExchangeSecret } from "@/lib/exchanges/secret-crypto";
import {
  fetchKrakenBalances,
  fetchKrakenTradeHistory,
} from "@/lib/exchanges/adapters/kraken-readonly";

const syncSchema = z.object({
  exchange: z.enum(["kraken"]),
});

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const authClient = createServerClient(request, response);
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = syncSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { exchange } = parsed.data;
  const db = createClient();
  const { data: connection, error: connectionError } = await db
    .from("exchange_connections")
    .select("api_key,api_secret_ciphertext,api_secret_nonce,permissions,is_testnet")
    .eq("user_id", user.id)
    .eq("exchange", exchange)
    .eq("is_active", true)
    .is("revoked_at", null)
    .single();

  if (connectionError || !connection) {
    return NextResponse.json(
      { error: "Exchange connection not found" },
      { status: 404 },
    );
  }

  try {
    const apiSecret = decryptExchangeSecret(
      connection.api_secret_ciphertext,
      connection.api_secret_nonce,
    );
    const apiKey = connection.api_key;

    const balances =
      exchange === "kraken"
        ? await fetchKrakenBalances(apiKey, apiSecret)
        : // EU/EØS (2026): Binance geo-blokkert (MiCA) — kun Kraken støttes.
          [];

    // Keep wallets as current source for dashboard totals.
    if (balances.length > 0) {
      const rows = balances.map((b) => ({
        user_id: user.id,
        currency: b.currency,
        balance: b.balance,
      }));

      const { error: walletsError } = await db
        .from("wallets")
        .upsert(rows, { onConflict: "user_id,currency" });
      if (walletsError) {
        return NextResponse.json({ error: walletsError.message }, { status: 500 });
      }
    }

    let trades: unknown[] = [];
    const permissions = (connection.permissions ?? {}) as Record<string, boolean>;
    if (exchange === "kraken" && permissions.trade_history) {
      trades = await fetchKrakenTradeHistory(apiKey, apiSecret, 50);
    }

    await db
      .from("exchange_connections")
      .update({ last_validated_at: new Date().toISOString(), last_error: null })
      .eq("user_id", user.id)
      .eq("exchange", exchange);

    return NextResponse.json({
      ok: true,
      balances,
      trades,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    await db
      .from("exchange_connections")
      .update({ last_error: message })
      .eq("user_id", user.id)
      .eq("exchange", exchange);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
