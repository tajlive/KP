/**
 * Kraken Deposit Polling — Cron Job
 * Kjører hvert 5. minutt for å detektere nye fiat-innskudd
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Verifiser cron-secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Kall deposit-webhook
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/kraken/deposit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.CRON_SECRET!,
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Deposit check failed: ${error}` },
        { status: 500 },
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("Kraken deposit cron error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
