/**
 * Kraken Grid Start API
 * Starter ny grid-sesjon for bruker
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { KrakenClient } from "@/lib/exchanges/kraken/client";
import { decryptApiKey } from "@/lib/crypto/encrypt-api-keys";
import { KrakenGridTrader } from "@/lib/trading/kraken-grid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    // Verifiser API-nøkkel
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, capital, symbol = "BTCUSDT" } = body;

    if (!userId || !capital) {
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
    const krakenKey = await decryptApiKey(keys.api_key_encrypted);
    const krakenSecret = await decryptApiKey(keys.api_secret_encrypted);
    const client = new KrakenClient(krakenKey, krakenSecret);

    // Hent nåværende pris
    const ticker = await client.getTicker(symbol);
    const currentPrice = parseFloat(ticker.c[0]);

    // Beregn grid-parametere
    const gridLevels = 10;
    const priceRange = 0.1; // ±10%
    const lowerPrice = currentPrice * (1 - priceRange);
    const upperPrice = currentPrice * (1 + priceRange);
    const capitalPerLevel = capital / gridLevels;

    // Start grid
    const grid = new KrakenGridTrader(client, {
      symbol,
      lowerPrice,
      upperPrice,
      gridLevels,
      capitalPerLevel,
    });

    await grid.initialize();
    await grid.placeOrders();

    // Lagre grid-sesjon
    await supabase.from("trading_sessions").insert({
      user_id: userId,
      exchange: "kraken",
      symbol,
      status: "active",
      strategy_config: {
        lowerPrice,
        upperPrice,
        gridLevels,
        capitalPerLevel,
        totalCapital: capital,
      },
    });

    return NextResponse.json({
      success: true,
      gridStatus: grid.getStatus(),
      config: {
        symbol,
        lowerPrice,
        upperPrice,
        gridLevels,
        capitalPerLevel,
      },
    });
  } catch (error) {
    console.error("Grid start error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start grid" },
      { status: 500 },
    );
  }
}
