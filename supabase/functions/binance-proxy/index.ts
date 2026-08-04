/**
 * Binance Live Trading Proxy Edge Function
 *
 * Stateless signed-request proxy for Binance API calls from Cloudflare Workers.
 * Receives action + apiKey/apiSecret (one request only), signs the request,
 * rotates through mainnet/testnet endpoints with retry-on-429/5xx, and
 * returns the raw Binance response. Never persists API credentials.
 *
 * Auth:
 *   - Authorization header must be a valid Supabase JWT
 *     (NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY).
 *   - X-Binance-Proxy-Secret header must contain BINANCE_PROXY_SECRET.
 */

import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

const BINANCE_SIGNED_API_BASES = [
  "https://api.binance.com",
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com",
  "https://api4.binance.com",
  "https://data-api.binance.vision",
];

// Futures (fapi) bases — brukes når publicApiPath starter med /fapi/
// (leaderboard, copy-trading-data). Geo-blocket fra Cloudflare Workers,
// men nådd fra Supabase Edge (samme som spot-basene).
const BINANCE_FAPI_BASES = [
  "https://fapi.binance.com",
  "https://fapi1.binance.com",
  "https://fapi2.binance.com",
];

const BINANCE_TESTNET_BASES = ["https://testnet.binance.vision"];

const DEFAULT_RECV_WINDOW_MS = 5000;
const DEFAULT_TIMEOUT_MS = 10000;

const RETRYABLE_STATUSES: Record<number, true> = {
  429: true,
  500: true,
  502: true,
  503: true,
  504: true,
};

const ALLOWED_ACTIONS = [
  "account",
  "order",
  "balance",
  "openOrders",
  "cancelOrder",
  "orderStatus",
  "testConnection",
  "publicApi",    // Proxy unsigned public API calls (ticker/price, klines, depth)
] as const;

type Action = (typeof ALLOWED_ACTIONS)[number];

interface ProxyPayload {
  action: Action;
  apiKey: string
  apiSecret: string;
  testnet?: boolean;
  params?: Record<string, string | number>;
  publicApiPath?: string;  // For "publicApi" action: e.g. /api/v3/ticker/price?symbol=BTCUSDT
}

interface ProxySuccess {
  ok: true;
  status: number;
  body: unknown;
  endpointUsed: string;
}

interface ProxyError {
  ok: false;
  error: string;
  status?: number;
  endpointUsed: string;
}

function buildSignedQueryString(params: Record<string, string | number>): string {
  const sorted = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b));

  return sorted
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

async function createSignature(queryString: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(queryString));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getEndpointForAction(action: Action): { path: string; method: "GET" | "POST" | "DELETE" } {
  switch (action) {
    case "account":
    case "balance":
    case "testConnection":
      return { path: "/api/v3/account", method: "GET" };
    case "order":
      return { path: "/api/v3/order", method: "POST" };
    case "openOrders":
      return { path: "/api/v3/openOrders", method: "GET" };
    case "cancelOrder":
      return { path: "/api/v3/order", method: "DELETE" };
    case "orderStatus":
      return { path: "/api/v3/order", method: "GET" };
    default:
      throw new Error(`Unsupported action: ${action}`);
  }
}

async function fetchOncePublic(
  url: string,
): Promise<{ ok: true; status: number; body: unknown } | { ok: false; status: number; error: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Klarpakke/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await response.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = text; }

    if (!response.ok) {
      return { ok: false, status: response.status, error: `Binance API: ${response.status}` };
    }
    return { ok: true, status: response.status, body };
  } catch (error) {
    clearTimeout(timeoutId);
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

async function fetchOnce(
  url: string,
  method: "GET" | "POST" | "DELETE",
  apiKey: string,
): Promise<{ ok: true; status: number; body: unknown } | { ok: false; status: number; error: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "X-MBX-APIKEY": apiKey,
        Accept: "application/json",
        "User-Agent": "Klarpakke/1.0",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await response.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    if (!response.ok) {
      const msg =
        typeof body === "object" && body !== null && "msg" in body &&
          typeof (body as Record<string, unknown>).msg === "string"
          ? (body as { msg: string }).msg
          : response.statusText;
      return { ok: false, status: response.status, error: `Binance API error: ${response.status} ${msg}` };
    }

    return { ok: true, status: response.status, body };
  } catch (error) {
    clearTimeout(timeoutId);
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function proxyRequest(payload: ProxyPayload): Promise<ProxySuccess | ProxyError> {
  const { action, apiKey, apiSecret, testnet = false, params = {}, publicApiPath } = payload;

  // Public API passthrough — unsigned GET, no signing required
  if (action === "publicApi" && publicApiPath) {
    const isFapi = publicApiPath.startsWith("/fapi/");
    const bases = testnet
      ? BINANCE_TESTNET_BASES
      : isFapi
        ? BINANCE_FAPI_BASES
        : BINANCE_SIGNED_API_BASES;
    for (const base of bases) {
      const url = `${base}${publicApiPath}`;
      const result = await fetchOncePublic(url);
      if (result.ok) return { ok: true, status: result.status, body: result.body, endpointUsed: base };
    }
    return { ok: false, error: "All public API endpoints failed", endpointUsed: "" };
  }
  const { path, method } = getEndpointForAction(action);

  const timestamp = Date.now();
  const queryParams = {
    ...params,
    recvWindow: DEFAULT_RECV_WINDOW_MS,
    timestamp,
  };

  const queryString = buildSignedQueryString(queryParams);
  const signature = await createSignature(queryString, apiSecret);
  const signedQuery = `${queryString}&signature=${signature}`;

  const bases = testnet ? BINANCE_TESTNET_BASES : BINANCE_SIGNED_API_BASES;
  let lastError: ProxyError = { ok: false, error: "All endpoints failed", endpointUsed: "" };

  for (const base of bases) {
    const url = `${base}${path}?${signedQuery}`;
    const result = await fetchOnce(url, method, apiKey);

    if (result.ok) {
      return { ok: true, status: result.status, body: result.body, endpointUsed: base };
    }

    lastError = { ok: false, error: result.error, status: result.status, endpointUsed: base };

    if (result.status && RETRYABLE_STATUSES[result.status]) {
      const retry = await fetchOnce(url, method, apiKey);
      if (retry.ok) {
        return { ok: true, status: retry.status, body: retry.body, endpointUsed: base };
      }
      lastError = { ok: false, error: retry.error, status: retry.status, endpointUsed: base };
    }
  }

  return lastError;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Supabase Edge Functions require a valid JWT in the Authorization header.
    // The gateway validates that JWT before the function runs; we enforce an
    // additional shared secret via a custom header so we don't have to store the
    // Supabase service role key inside the function itself.
    const proxySecretHeader = req.headers.get("x-binance-proxy-secret") ?? "";
    const expectedProxySecret = Deno.env.get("BINANCE_PROXY_SECRET") ?? "";

    if (!expectedProxySecret || proxySecretHeader !== expectedProxySecret) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { action, apiKey, apiSecret, testnet = false, params, publicApiPath } = body;

    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return jsonResponse({ error: "Missing or invalid action" }, 400);
    }

    // publicApi doesn't need credentials
    if (action !== "publicApi" && (!apiKey || !apiSecret)) {
      return jsonResponse({ error: "Missing API credentials" }, 400);
    }

    const result = await proxyRequest({ action, apiKey, apiSecret, testnet, params, publicApiPath });

    if (result.ok) {
      return jsonResponse(
        { ok: true, status: result.status, data: result.body, endpointUsed: result.endpointUsed },
      );
    }

    return jsonResponse(
      { ok: false, error: result.error, status: result.status, endpointUsed: result.endpointUsed },
      result.status && result.status >= 400 ? result.status : 502,
    );
  } catch (error) {
    console.error("Binance proxy error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(errorMessage, 500);
  }
});
