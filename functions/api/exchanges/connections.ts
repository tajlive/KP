export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

import { z } from "zod";
import { createClient, createServerClient } from "@/lib/supabase/server";
import {
  validateBinanceReadOnlyKeys,
} from "@/lib/exchanges/adapters/binance-readonly";
import {
  validateKrakenReadOnlyKeys,
} from "@/lib/exchanges/adapters/kraken-readonly";
import { encryptExchangeSecret } from "@/lib/exchanges/secret-crypto";
import type { ExchangeConnectionView, ExchangePermission } from "@/lib/exchanges/types";

const connectionSchema = z.object({
  exchange: z.enum(["binance", "kraken"]),
  apiKey: z.string().min(8),
  apiSecret: z.string().min(8),
  isTestnet: z.boolean().optional().default(false),
  permissions: z.array(z.enum(["balances", "trade_history", "open_orders", "trading"])).default([
    "balances",
    "trade_history",
  ]),
});

function permissionsToJson(permissions: ExchangePermission[]) {
  return {
    balances: permissions.includes("balances"),
    trade_history: permissions.includes("trade_history"),
    open_orders: permissions.includes("open_orders"),
    trading: permissions.includes("trading"),
  };
}

async function GETHandler(request: Request, env: Env)(request: NextRequest) {
  const response = NextResponse.next();
  const authClient = createServerClient(request, response);
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { 'Content-Type': 'application/json', ..., { status: 401 }.headers || {} }, status: , { status: 401 }.status || 200 });
  }

  const db = createClient();
  const { data, error } = await db
    .from("exchange_connections")
    .select(
      "id,exchange,is_active,is_testnet,permissions,created_at,last_validated_at,last_error",
    )
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { 'Content-Type': 'application/json', ..., { status: 500 }.headers || {} }, status: , { status: 500 }.status || 200 });
  }

  const connections: ExchangeConnectionView[] = (data ?? []).map((row) => ({
    id: row.id,
    exchange: row.exchange as "binance" | "kraken",
    isActive: Boolean(row.is_active),
    isTestnet: Boolean(row.is_testnet),
    permissions: Object.entries((row.permissions ?? {}) as Record<string, boolean>)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key as ExchangePermission),
    createdAt: row.created_at,
    lastValidatedAt: row.last_validated_at,
    lastError: row.last_error,
  }));

  return new Response(JSON.stringify({ connections });
}

async function POSTHandler(request: Request, env: Env)(request: NextRequest) {
  const response = NextResponse.next(), { headers: { 'Content-Type': 'application/json' } });
  const authClient = createServerClient(request, response);
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { 'Content-Type': 'application/json', ..., { status: 401 }.headers || {} }, status: , { status: 401 }.status || 200 });
  }

  const parsed = connectionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { exchange, apiKey, apiSecret, isTestnet, permissions } = parsed.data;

  try {
    if (exchange === "kraken") {
      if (permissions.includes("trading")) {
        return NextResponse.json(
          { error: "Kraken is read-only in this phase" },
          { status: 400 },
        );
      }
      await validateKrakenReadOnlyKeys(apiKey, apiSecret);
    } else {
      await validateBinanceReadOnlyKeys(apiKey, apiSecret);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validation failed";
    return new Response(JSON.stringify({ error: message }), { headers: { 'Content-Type': 'application/json', ..., { status: 400 }.headers || {} }, status: , { status: 400 }.status || 200 });
  }

  const { ciphertext, nonce } = encryptExchangeSecret(apiSecret);

  const db = createClient();
  const { error } = await db.from("exchange_connections").upsert(
    {
      user_id: user.id,
      exchange,
      api_key: apiKey,
      api_secret_ciphertext: ciphertext,
      api_secret_nonce: nonce,
      is_testnet: isTestnet,
      is_active: true,
      revoked_at: null,
      last_error: null,
      last_validated_at: new Date().toISOString(),
      permissions: permissionsToJson(permissions),
    },
    { onConflict: "user_id,exchange" },
  );

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { 'Content-Type': 'application/json', ..., { status: 500 }.headers || {} }, status: , { status: 500 }.status || 200 });
  }

  return new Response(JSON.stringify({ ok: true });
}

async function DELETEHandler(request: Request, env: Env)(request: NextRequest) {
  const response = NextResponse.next(), { headers: { 'Content-Type': 'application/json' } });
  const authClient = createServerClient(request, response);
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { 'Content-Type': 'application/json', ..., { status: 401 }.headers || {} }, status: , { status: 401 }.status || 200 });
  }

  const exchange = new URL(request.url).searchParams.get("exchange");
  if (!exchange || !["binance", "kraken"].includes(exchange)) {
    return new Response(JSON.stringify({ error: "Missing exchange" }), { headers: { 'Content-Type': 'application/json', ..., { status: 400 }.headers || {} }, status: , { status: 400 }.status || 200 });
  }

  const db = createClient();
  const { error } = await db
    .from("exchange_connections")
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("exchange", exchange);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { 'Content-Type': 'application/json', ..., { status: 500 }.headers || {} }, status: , { status: 500 }.status || 200 });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const method = request.method;
    if (method === 'GET') {
      return GETHandler(request, env);
    }
    if (method === 'POST') {
      return POSTHandler(request, env);
    }
    if (method === 'DELETE') {
      return DELETEHandler(request, env);
    }
    return new Response('Method not allowed', { status: 405 });
  },
};
