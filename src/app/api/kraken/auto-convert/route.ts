/**
 * Auto-konvertering av fiat (EUR/USD) til USDT på Kraken
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { KrakenClient } from "@/lib/exchanges/kraken/client";
import { decryptApiKey } from "@/lib/crypto/encrypt-api-keys";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    // Verifiser API-nøkkel
    const authKey = request.headers.get("x-api-key");
    if (authKey !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, fromAsset, amount, toAsset = "USDT" } = body;

    if (!userId || !fromAsset || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Hent brukerens Kraken-nøkler
    const { data: keys, error } = await supabase
      .from("user_kraken_keys")
      .select("api_key_encrypted, api_secret_encrypted")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (error || !keys) {
      return NextResponse.json(
        { error: "Kraken keys not found" },
        { status: 404 },
      );
    }

    // Dekrypter nøkler
    const apiKey = await decryptApiKey(keys.api_key_encrypted);
    const apiSecret = await decryptApiKey(keys.api_secret_encrypted);
    const client = new KrakenClient(apiKey, apiSecret);

    // Sjekk nåværende balanse
    const balance = await client.getBalance();
    const fromBalance = parseFloat(balance[fromAsset] || "0");

    if (fromBalance < parseFloat(amount)) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 },
      );
    }

    // Konverter til USDT (market order)
    const FIAT_TO_USDT_PAIR: Record<string, string> = {
      USD: "USDTUSD",
      ZUSD: "USDTUSD",
      EUR: "USDTEUR",
      ZEUR: "USDTEUR",
    };
    const pair =
      FIAT_TO_USDT_PAIR[fromAsset] ??
      FIAT_TO_USDT_PAIR[fromAsset.replace(/^Z/, "")];

    if (!pair) {
      return NextResponse.json(
        { error: "Unsupported fiat currency" },
        { status: 400 },
      );
    }

    if (parseFloat(amount) < 5) {
      return NextResponse.json(
        { error: "Minimum 5 USD/EUR for conversion" },
        { status: 400 },
      );
    }

    // Beregn volum (beløp i fromAsset)
    const volume = amount;

    // Utfør market buy
    const order = await client.marketBuy(pair, volume);

    // Logg konvertering
    await supabase.from("kraken_conversions").insert({
      user_id: userId,
      from_asset: fromAsset,
      to_asset: toAsset,
      amount: parseFloat(amount),
      order_id: order.txid[0],
      status: "completed",
    });

    return NextResponse.json({
      success: true,
      orderId: order.txid[0],
      from: { asset: fromAsset, amount },
      to: { asset: toAsset, estimated: amount }, // 1:1 for stablecoins
    });
  } catch (error) {
    console.error("Auto-convert error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Conversion failed" },
      { status: 500 },
    );
  }
}
