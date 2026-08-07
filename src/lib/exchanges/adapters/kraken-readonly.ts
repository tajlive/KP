import crypto from "crypto";
import type { NormalizedTrade, NormalizedWalletBalance } from "@/lib/exchanges/types";

const KRAKEN_BASE = "https://api.kraken.com";

function mapKrakenAsset(asset: string): string {
  const normalized = asset.replace(/^X|^Z/, "");
  if (normalized === "XBT") return "BTC";
  return normalized;
}

function signKrakenRequest(
  endpointPath: string,
  nonce: string,
  postData: string,
  apiSecret: string,
): string {
  const secret = Buffer.from(apiSecret, "base64");
  const hash = crypto.createHash("sha256").update(`${nonce}${postData}`).digest();
  const hmac = crypto.createHmac("sha512", secret);
  const signature = hmac.update(endpointPath).update(hash).digest("base64");
  return signature;
}

async function krakenPrivateRequest<T>(
  path: string,
  apiKey: string,
  apiSecret: string,
  body: URLSearchParams,
): Promise<T> {
  const nonce = (Date.now() * 1000).toString(); // μs-nonce (API-nøkkel med 10000ms window)
  body.set("nonce", nonce);
  const signature = signKrakenRequest(path, nonce, body.toString(), apiSecret);

  const res = await fetch(`${KRAKEN_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "API-Key": apiKey,
      "API-Sign": signature,
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Kraken API error (${res.status})`);
  }

  const json = await res.json();
  if (Array.isArray(json.error) && json.error.length > 0) {
    throw new Error(`Kraken API: ${json.error.join(", ")}`);
  }
  return json.result as T;
}

export async function validateKrakenReadOnlyKeys(
  apiKey: string,
  apiSecret: string,
): Promise<void> {
  await krakenPrivateRequest("/0/private/Balance", apiKey, apiSecret, new URLSearchParams());
}

export async function fetchKrakenBalances(
  apiKey: string,
  apiSecret: string,
): Promise<NormalizedWalletBalance[]> {
  const result = await krakenPrivateRequest<Record<string, string>>(
    "/0/private/Balance",
    apiKey,
    apiSecret,
    new URLSearchParams(),
  );

  return Object.entries(result)
    .map(([asset, amount]) => ({
      currency: mapKrakenAsset(asset),
      balance: Number(amount),
    }))
    .filter((row) => Number.isFinite(row.balance) && row.balance > 0);
}

type KrakenTradeRow = {
  pair: string;
  type: "buy" | "sell";
  vol: string;
  price: string;
  time: number;
};

type KrakenTradesHistoryResponse = {
  trades: Record<string, KrakenTradeRow>;
};

export async function fetchKrakenTradeHistory(
  apiKey: string,
  apiSecret: string,
  limit = 50,
): Promise<NormalizedTrade[]> {
  const params = new URLSearchParams();
  params.set("trades", "true");
  params.set("ofs", "0");

  const result = await krakenPrivateRequest<KrakenTradesHistoryResponse>(
    "/0/private/TradesHistory",
    apiKey,
    apiSecret,
    params,
  );

  return Object.entries(result.trades)
    .slice(0, limit)
    .map(([externalId, trade]) => ({
      externalId,
      symbol: trade.pair,
      side: trade.type,
      quantity: Number(trade.vol),
      price: Number(trade.price),
      timestamp: new Date(trade.time * 1000).toISOString(),
    }))
    .filter((row) => Number.isFinite(row.quantity) && Number.isFinite(row.price));
}
