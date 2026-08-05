/**
 * Kraken Connect API
 * Lagrer brukerens Kraken API-nøkler kryptert
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { KrakenClient } from "@/lib/exchanges/kraken/client";
import { encryptApiKey } from "@/lib/crypto/encrypt-api-keys";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, apiKey, apiSecret } = body;

    if (!userId || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Verifiser at nøklene fungerer
    const client = new KrakenClient(apiKey, apiSecret);
    try {
      await client.getBalance();
    } catch {
      return NextResponse.json(
        { error: "Invalid API keys" },
        { status: 400 },
      );
    }

    // Krypter nøklene
    const encryptedKey = await encryptApiKey(apiKey);
    const encryptedSecret = await encryptApiKey(apiSecret);

    // Lagre kryptert — onConflict: user_id slik at ny tilkobling for samme
    // bruker oppdaterer eksisterende rad i stedet for å feile på UNIQUE(user_id)
    const { error } = await supabase.from("user_kraken_keys").upsert(
      {
        user_id: userId,
        api_key_encrypted: encryptedKey,
        api_secret_encrypted: encryptedSecret,
        is_active: true,
        last_validated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Kraken connect error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Connection failed" },
      { status: 500 },
    );
  }
}
