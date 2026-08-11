/**
 * Kraken Balance Sync — henter live balanse + åpne ordre fra Kraken
 * for alle brukere med aktive nøkler, lagrer i kraken_live_state.
 * Kjøres av pg_cron hvert 5. minutt.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { KrakenClient } from "@/lib/exchanges/kraken/client";
import { decryptApiKey } from "@/lib/crypto/encrypt-api-keys";

export const runtime = "nodejs"; // Buffer i encrypt-api-keys krever node-runtime — edge krasjer (500 siden 04:45)
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Par → internt symbol (for UI-samsvar med TOP_SYMBOLS-format)
const PAIR_DISPLAY: Record<string, string> = {
  XBTUSDC: "BTCUSDC",
  ETHUSDC: "ETHUSDC",
  SOLUSDC: "SOLUSDC",
  USDCUSDT: "USDCUSDT",
  XBTUSD: "BTCUSD",
};

export async function POST(request: NextRequest) {
  // Verifiser cron — støtter både x-api-key (vår) og Authorization: Bearer (klarpakke_trigger_cron)
  const authKey = request.headers.get("x-api-key");
  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  const valid =
    authKey === process.env.CRON_SECRET || bearer === process.env.CRON_SECRET;
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: users, error } = await supabase
      .from("user_kraken_keys")
      .select("user_id, api_key_encrypted, api_secret_encrypted")
      .eq("is_active", true);

    if (error) throw new Error(`DB: ${error.message}`);

    const results = [];
    for (const user of users || []) {
      try {
        const apiKey = await decryptApiKey(user.api_key_encrypted);
        const apiSecret = await decryptApiKey(user.api_secret_encrypted);
        const client = new KrakenClient(apiKey, apiSecret);

        // Hent balance + åpne ordre — serielt (samme API-nøkkel, nonce må være unik)
        const balance = await client.getBalance();
        const openOrders = await client.getOpenOrders();

        // Priser for ikke-USDC-assets (XXBT, XETH, XSOL, ZEUR...)
        const tickerPairs: string[] = [];
        const assetToPair: Record<string, string> = {};
        const assets = Object.entries(balance).filter(
          ([, v]) => parseFloat(v) > 0,
        );
        for (const [asset] of assets) {
          const map: Record<string, string> = {
            XXBT: "XBTUSDC",
            XETH: "ETHUSDC",
            SOL: "SOLUSDC", // Kraken bruker SOL uten prefiks (aldri XSOL)
            USDC: "USDCUSDC",
          };
          const pair = map[asset];
          if (pair && pair !== "USDCUSDC") {
            tickerPairs.push(pair);
            assetToPair[asset] = pair;
          }
        }

        let prices: Record<string, { c: string[] }> = {};
        if (tickerPairs.length) {
          try {
            prices = (await client.getTickers(
              tickerPairs,
            )) as unknown as Record<string, { c: string[] }>;
          } catch {
            prices = {};
          }
        }

        // Totalverdi i USDC
        let totalUsdc = 0;
        const holdings: Record<string, { amount: string; usdcValue: number }> =
          {};
        for (const [asset, amount] of assets) {
          const amt = parseFloat(amount);
          if (asset === "USDC") {
            totalUsdc += amt;
            holdings[asset] = { amount, usdcValue: amt };
          } else {
            const pair = assetToPair[asset];
            const price =
              pair && prices[pair] ? parseFloat(prices[pair].c[0]) : 0;
            const usdcValue = amt * price;
            totalUsdc += usdcValue;
            holdings[asset] = {
              amount,
              usdcValue: Math.round(usdcValue * 100) / 100,
            };
          }
        }

        // Åpne ordrer
        const open = (openOrders as Record<string, unknown>).open ?? {};
        const orderList = Object.entries(open).map(([txid, o]) => {
          const ord = o as {
            descr: { pair: string; type: string; price: string };
            vol: string;
            vol_exec: string;
            status: string;
          };
          return {
            txid,
            pair: PAIR_DISPLAY[ord.descr.pair] ?? ord.descr.pair,
            side: ord.descr.type,
            price: parseFloat(ord.descr.price),
            volume: parseFloat(ord.vol),
            filled: parseFloat(ord.vol_exec ?? "0"),
            status: ord.status,
          };
        });

        const openBuy = orderList.filter((o) => o.side === "buy").length;
        const openSell = orderList.filter((o) => o.side === "sell").length;

        // Realisert gevinst — fra grid-state fil hvis mulig, ellers 0
        let realized = 0;
        try {
          const { data: conv } = await supabase
            .from("kraken_conversions")
            .select("amount")
            .eq("user_id", user.user_id)
            .eq("to_asset", "USDT");
          realized = 0; // konverteringer er ikke gevinst — setter 0 inntil trade-sync
        } catch {
          realized = 0;
        }

        const snapshot = {
          balance: Object.fromEntries(assets),
          orders: orderList,
          fetchedAt: new Date().toISOString(),
        };

        const { error: upsertErr } = await supabase
          .from("kraken_live_state")
          .upsert(
            {
              user_id: user.user_id,
              snapshot,
              total_usdc: Math.round(totalUsdc * 100) / 100,
              open_orders: orderList.length,
              open_buy_orders: openBuy,
              open_sell_orders: openSell,
              realized_profit_usdc: realized,
              base_holdings: holdings,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );

        if (upsertErr) throw new Error(`Upsert: ${upsertErr.message}`);
        results.push({
          userId: user.user_id,
          totalUsdc: Math.round(totalUsdc * 100) / 100,
          orders: orderList.length,
        });
      } catch (e) {
        results.push({
          userId: user.user_id,
          error: e instanceof Error ? e.message : "unknown",
        });
      }
    }

    return NextResponse.json({
      success: true,
      synced: results.length,
      results,
    });
  } catch (error) {
    console.error("Kraken balance sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 },
    );
  }
}
