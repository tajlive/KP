import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import LiveMarketTickerClient from "./LiveMarketTickerClient";

type CoinPrice = Database["public"]["Tables"]["coin_prices"]["Row"];

export const dynamic = "force-dynamic";

/**
 * LiveMarketTicker — server component that fetches real coin prices
 * from Supabase and renders a live-updating client component.
 */
export default async function LiveMarketTicker() {
  let coins: CoinPrice[] = [];

  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("coin_prices")
      .select("*")
      .order("symbol", { ascending: true });

    if (data) coins = data;
  } catch (err) {
    console.error("[LiveMarketTicker] Failed to fetch coin prices:", err);
  }

  if (coins.length === 0) return null;

  return <LiveMarketTickerClient coins={coins} />;
}
