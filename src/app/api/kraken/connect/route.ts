/**
 * Kraken Connect API
 * Lagrer brukerens Kraken API-nøkler kryptert
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { KrakenClient } from "@/lib/exchanges/kraken/client";
import { encryptApiKey } from "@/lib/crypto/encrypt-api-keys";

export const dynamic = "force-dynamic";

// Service-klient opprettes lazily (ruten kan kjøre i Edge/Node uten at
// SUPABASE_SERVICE_ROLE_KEY er tilgjengelig ved module-load i alle miljøer).
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service env vars missing");
  }
  return createServiceClient(url, key);
}

/**
 * Resolver bruker-id: foretrekker session (sikker — klienten kan ikke
 * koble nøkler til andre), fallback til body.userId for onboarding
 * (server-rendret med kjent userId).
 */
async function resolveUserId(request: NextRequest, bodyUserId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id) return user.id;
  return bodyUserId || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, apiSecret } = body;
    const userId = await resolveUserId(request, body.userId);

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
      return NextResponse.json({ error: "Invalid API keys" }, { status: 400 });
    }

    // Krypter nøklene
    const encryptedKey = await encryptApiKey(apiKey);
    const encryptedSecret = await encryptApiKey(apiSecret);

    // Lagre kryptert — onConflict: user_id slik at ny tilkobling for samme
    // bruker oppdaterer eksisterende rad i stedet for å feile på UNIQUE(user_id)
    const { error } = await getServiceClient()
      .from("user_kraken_keys")
      .upsert(
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

/** Koble fra: fjerner brukerens Kraken-nøkler (session-autentisert). */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await getServiceClient()
      .from("user_kraken_keys")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Kraken disconnect error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Disconnect failed" },
      { status: 500 },
    );
  }
}
