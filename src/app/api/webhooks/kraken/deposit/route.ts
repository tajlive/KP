/**
 * Kraken Webhook for fiat-deposit detection
 * Kraken støtter ikke webhooks direkte — bruker polling
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { KrakenClient } from "@/lib/exchanges/kraken/client";
import { decryptApiKey } from "@/lib/crypto/encrypt-api-keys";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Polling-intervall (5 minutter)
const POLL_INTERVAL_MS = 5 * 60 * 1000;

// Siste kjente deposit-ID per bruker (for å unngå duplikater)
const lastDepositIds = new Map<string, string>();

export async function POST(request: NextRequest) {
  try {
    // Verifiser API-nøkkel (intern bruk)
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Hent alle brukere med Kraken-tilkobling
    const { data: users, error } = await supabase
      .from("user_kraken_keys")
      .select("user_id, api_key_encrypted, api_secret_encrypted")
      .eq("is_active", true);

    if (error) {
      console.error("Failed to fetch users:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const results = [];

    for (const user of users || []) {
      try {
        // Dekrypter nøkler
        const apiKey = await decryptApiKey(user.api_key_encrypted);
        const apiSecret = await decryptApiKey(user.api_secret_encrypted);
        
        const client = new KrakenClient(apiKey, apiSecret);
        const deposits = await client.getDepositHistory();

        // Filtrer nye deposits (siste 24 timer)
        const newDeposits = Object.values(deposits).filter(
          (d: unknown) => {
            const deposit = d as {
              status: string;
              time: number;
              assetid: string;
            };
            return (
              deposit.status === "Success" &&
              new Date(deposit.time * 1000) >
                new Date(Date.now() - 24 * 60 * 60 * 1000) &&
              deposit.assetid !== lastDepositIds.get(user.user_id)
            );
          },
        ) as Array<{
          status: string;
          time: number;
          assetid: string;
          amount: string;
        }>;

        for (const deposit of newDeposits) {
          // Trigger auto-konvertering
          await triggerAutoConvert(user.user_id, deposit.assetid, deposit.amount);

          // Oppdater siste deposit-ID
          lastDepositIds.set(user.user_id, deposit.assetid);

          results.push({
            userId: user.user_id,
            asset: deposit.assetid,
            amount: deposit.amount,
            status: "converted",
          });
        }
      } catch (err) {
        console.error(`Failed to process user ${user.user_id}:`, err);
        results.push({
          userId: user.user_id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function triggerAutoConvert(
  userId: string,
  asset: string,
  amount: string,
): Promise<void> {
  // Bare konverter EUR/USD til USDT
  if (!["ZEUR", "ZUSD", "EUR", "USD"].includes(asset)) {
    return;
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/kraken/auto-convert`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CRON_SECRET!,
      },
      body: JSON.stringify({
        userId,
        fromAsset: asset,
        amount,
        toAsset: "USDT",
      }),
    },
  );

  if (!response.ok) {
    console.error("Auto-convert failed:", await response.text());
  }
}
