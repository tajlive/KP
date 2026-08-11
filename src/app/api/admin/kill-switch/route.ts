/**
 * Kill Switch — Nødstopp for all trading (Kraken + OKX)
 * Kansellerer alle ordre, stopper alle sesjoner, deaktiverer brukere
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { KrakenClient } from "@/lib/exchanges/kraken/client";
import { OkxClient } from "@/lib/exchanges/okx/client";
import { decryptApiKey } from "@/lib/crypto/encrypt-api-keys";

export const runtime = "nodejs"; // @supabase/supabase-js krever process.version — krasjer i edge (500 i prod)
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

interface KillSwitchResult {
  userId: string;
  ordersCancelled: number;
  sessionsStopped: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  // Verifiser admin-tilgang
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { userId, reason = "manual_kill_switch" } = body;

  try {
    // Hent alle aktive exchange-brukere (Kraken + OKX) eller spesifikk bruker
    const krakenQuery = supabase
      .from("user_kraken_keys")
      .select("user_id, api_key_encrypted, api_secret_encrypted")
      .eq("is_active", true);
    const okxQuery = supabase
      .from("user_okx_keys")
      .select(
        "user_id, api_key_encrypted, api_secret_encrypted, passphrase_encrypted",
      )
      .eq("is_active", true);

    if (userId) {
      krakenQuery.eq("user_id", userId);
      okxQuery.eq("user_id", userId);
    }

    const [krakenRes, okxRes] = await Promise.all([
      krakenQuery,
      okxQuery,
    ]);

    if (krakenRes.error) {
      throw new Error(`Database error (kraken): ${krakenRes.error.message}`);
    }
    if (okxRes.error) {
      throw new Error(`Database error (okx): ${okxRes.error.message}`);
    }

    const results: KillSwitchResult[] = [];

    // --- Kraken-brukere ---
    for (const user of krakenRes.data || []) {
      const result: KillSwitchResult = {
        userId: user.user_id,
        ordersCancelled: 0,
        sessionsStopped: 0,
      };

      try {
        // 1. Dekrypter nøkler
        const apiKey = await decryptApiKey(user.api_key_encrypted);
        const apiSecret = await decryptApiKey(user.api_secret_encrypted);
        const client = new KrakenClient(apiKey, apiSecret);

        // 2. Kanseller alle åpne ordre
        const openOrders = await client.getOpenOrders();
        for (const order of Object.values(openOrders)) {
          const o = order as { txid?: string };
          if (o.txid) {
            try {
              await client.cancelOrder(o.txid);
              result.ordersCancelled++;
            } catch (err) {
              console.error(`Failed to cancel order ${o.txid}:`, err);
            }
          }
        }

        // 3. Deaktiver brukerens Kraken-tilkobling
        await supabase
          .from("user_kraken_keys")
          .update({ is_active: false })
          .eq("user_id", user.user_id);

        // 4. Stopp alle aktive trading-sesjoner
        const { data: sessions } = await supabase
          .from("trading_sessions")
          .update({ status: "stopped" })
          .eq("user_id", user.user_id)
          .eq("status", "active")
          .select("id");

        result.sessionsStopped = sessions?.length || 0;

        // 5. Logg kill switch
        await supabase.from("admin_audit_log").insert({
          action: "kill_switch_activated",
          target_user_id: user.user_id,
          details: {
            exchange: "kraken",
            reason,
            orders_cancelled: result.ordersCancelled,
            sessions_stopped: result.sessionsStopped,
          },
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        result.error = err instanceof Error ? err.message : "Unknown error";
        console.error(`Kill switch failed for user ${user.user_id}:`, err);
      }

      results.push(result);
    }

    // --- OKX-brukere ---
    for (const user of okxRes.data || []) {
      const result: KillSwitchResult = {
        userId: user.user_id,
        ordersCancelled: 0,
        sessionsStopped: 0,
      };

      try {
        // 1. Dekrypter nøkler (inkl. passphrase — OKX krever 3 hemmeligheter)
        const apiKey = await decryptApiKey(user.api_key_encrypted);
        const apiSecret = await decryptApiKey(user.api_secret_encrypted);
        const passphrase = await decryptApiKey(user.passphrase_encrypted);
        const client = new OkxClient({ apiKey, apiSecret, passphrase });

        // 2. Kanseller alle åpne ordrer
        const openOrders = await client.getOpenOrders();
        for (const order of openOrders) {
          try {
            await client.cancelOrder(order.instId, order.ordId);
            result.ordersCancelled++;
          } catch (err) {
            console.error(`Failed to cancel order ${order.ordId}:`, err);
          }
        }

        // 3. Deaktiver brukerens OKX-tilkobling
        await supabase
          .from("user_okx_keys")
          .update({ is_active: false })
          .eq("user_id", user.user_id);

        // 4. Stopp alle aktive trading-sesjoner
        const { data: sessions } = await supabase
          .from("trading_sessions")
          .update({ status: "stopped" })
          .eq("user_id", user.user_id)
          .eq("status", "active")
          .select("id");

        result.sessionsStopped = sessions?.length || 0;

        // 5. Logg kill switch
        await supabase.from("admin_audit_log").insert({
          action: "kill_switch_activated",
          target_user_id: user.user_id,
          details: {
            exchange: "okx",
            reason,
            orders_cancelled: result.ordersCancelled,
            sessions_stopped: result.sessionsStopped,
          },
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        result.error = err instanceof Error ? err.message : "Unknown error";
        console.error(`Kill switch failed for user ${user.user_id}:`, err);
      }

      results.push(result);
    }

    return NextResponse.json({
      success: true,
      reason,
      usersAffected: results.length,
      totalOrdersCancelled: results.reduce(
        (sum, r) => sum + r.ordersCancelled,
        0,
      ),
      totalSessionsStopped: results.reduce(
        (sum, r) => sum + r.sessionsStopped,
        0,
      ),
      results,
    });
  } catch (error) {
    console.error("Kill switch error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Kill switch failed",
        success: false,
      },
      { status: 500 },
    );
  }
}

// GET: Sjekk kill switch status
export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: activeUsers } = await supabase
    .from("user_kraken_keys")
    .select("user_id")
    .eq("is_active", true);

  const { data: activeSessions } = await supabase
    .from("trading_sessions")
    .select("id")
    .eq("status", "active");

  return NextResponse.json({
    killSwitchReady: true,
    activeKrakenUsers: activeUsers?.length || 0,
    activeTradingSessions: activeSessions?.length || 0,
    timestamp: new Date().toISOString(),
  });
}
