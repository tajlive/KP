import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { upsertAutoTradingConfig } from "@/lib/supabase/auto-trading";
import { z } from "zod";

const activateSchema = z.object({
  risk_level: z.enum(["low", "medium", "high"]).optional(),
});

/**
 * Idempotently ensure the user has an auto_trade_settings row and enable
 * auto-trading. This is the canonical entry point for the cockpit "activate
 * auto-trading" CTA, and also fixes users who signed up before the signup
 * trigger created the row.
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth("no");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine; defaults will be used.
    }

    const parsed = activateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const config = await upsertAutoTradingConfig(user.id, {
      enabled: true,
      risk_level: parsed.data.risk_level ?? "medium",
    });

    return NextResponse.json({
      ok: true,
      autoTradingEnabled: config.enabled,
      risk_level: config.risk_level,
    });
  } catch (error) {
    console.error("[POST /api/trading/auto-trade/activate]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to activate auto-trading", message },
      { status: 500 },
    );
  }
}
