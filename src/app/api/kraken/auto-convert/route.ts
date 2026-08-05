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

/** Logger konvertering til DB og returnerer standard respons */
async function logAndRespond(
  userId: string,
  fromAsset: string,
  toAsset: string,
  amount: string,
  order: { txid: string[] },
) {
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
    to: { asset: toAsset, estimated: amount }, // ~1:1 for stablecoin/fiat
  });
}

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
    // Par hvor fromAsset er QUOTE-valutaen (vi oppgir volum i fromAsset)
    const QUOTE_PAIRS: Record<string, string> = {
      USD: "USDTUSD",
      ZUSD: "USDTUSD",
      EUR: "USDTEUR",
      ZEUR: "USDTEUR",
    };
    // Par hvor USDT er quote og fromAsset er base — her må vi konvertere
    // beløpet til base-enhet via nåpris (viqc-flagget fungerer ikke da
    // fromAsset != quote)
    const BASE_PAIRS: Record<string, string> = {
      USDC: "USDCUSDT",
    };

    const amountNum = parseFloat(amount);

    if (QUOTE_PAIRS[fromAsset]) {
      if (amountNum < 5) {
        return NextResponse.json(
          { error: "Minimum 5 USD/EUR for conversion" },
          { status: 400 },
        );
      }
      // Volum i quote (fromAsset) — krever oflag=viqc
      const order = await client.marketBuyQuote(QUOTE_PAIRS[fromAsset], amount);
      return await logAndRespond(userId, fromAsset, toAsset, amount, order);
    }

    if (BASE_PAIRS[fromAsset]) {
      if (amountNum < 5) {
        return NextResponse.json(
          { error: "Minimum 5 for conversion" },
          { status: 400 },
        );
      }
      // fromAsset ER base — vi SELGER base for å få USDT (quote).
      // Volum oppgis i base-enhet (f.eks. 60 USDC).
      const order = await client.marketSell(BASE_PAIRS[fromAsset], amount);
      return await logAndRespond(userId, fromAsset, toAsset, amount, order);
    }

    return NextResponse.json(
      { error: "Unsupported currency for conversion" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Auto-convert error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Conversion failed" },
      { status: 500 },
    );
  }
}
