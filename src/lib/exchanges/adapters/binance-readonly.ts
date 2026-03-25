import crypto from "crypto";
import type { NormalizedWalletBalance } from "@/lib/exchanges/types";

const BINANCE_BASE = "https://api.binance.com";

function signQuery(query: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(query).digest("hex");
}

export async function validateBinanceReadOnlyKeys(
  apiKey: string,
  apiSecret: string,
): Promise<void> {
  const timestamp = Date.now();
  const query = `timestamp=${timestamp}`;
  const signature = signQuery(query, apiSecret);

  const res = await fetch(`${BINANCE_BASE}/api/v3/account?${query}&signature=${signature}`, {
    headers: {
      "X-MBX-APIKEY": apiKey,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Binance API error (${res.status})`);
  }
}

type BinanceAccount = {
  balances: Array<{ asset: string; free: string; locked: string }>;
};

export async function fetchBinanceBalances(
  apiKey: string,
  apiSecret: string,
): Promise<NormalizedWalletBalance[]> {
  const timestamp = Date.now();
  const query = `timestamp=${timestamp}`;
  const signature = signQuery(query, apiSecret);

  const res = await fetch(`${BINANCE_BASE}/api/v3/account?${query}&signature=${signature}`, {
    headers: {
      "X-MBX-APIKEY": apiKey,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Binance API error (${res.status})`);
  }

  const data = (await res.json()) as BinanceAccount;
  return data.balances
    .map((row) => ({
      currency: row.asset,
      balance: Number(row.free) + Number(row.locked),
    }))
    .filter((row) => Number.isFinite(row.balance) && row.balance > 0);
}
