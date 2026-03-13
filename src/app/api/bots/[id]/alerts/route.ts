import { withAuth, withRateLimit } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { alertConfigSchema } from "@/lib/validation/schemas";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/bots/[id]/alerts — Get alert config for a bot (authenticated)
 */
export const GET = withAuth(async (req: NextRequest, { user }) => {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const id = segments[segments.indexOf("bots") + 1];

  const db: unknown = (await createClient()) as unknown;

  const { data, error } = await db
    .from("bot_alert_configs")
    .select("*")
    .eq("strategy_id", id)
    .eq("user_id" as unknown, user.id)
    .single() as unknown;

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    config: data ?? {
      strategy_id: id,
      drawdown_threshold_pct: 10,
      daily_loss_limit_nok: null,
      notify_on_trade: true,
      notify_on_error: true,
      notification_channels: ["push"],
    },
  });
});

/**
 * POST /api/bots/[id]/alerts — Create/update alert config (authenticated + rate limited + validated)
 */
export const POST = withRateLimit(
  20,
  60_000,
  async (req: NextRequest, { user }) => {
    const url = new URL(req.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.indexOf("bots") + 1];

    const body = await req.json();
    const parsed = alertConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const db: unknown = (await createClient()) as unknown;

    // Verify ownership: user must own this strategy
    const { data: strategy } = await db
      .from("strategies" as unknown)
      .select("id")
      .eq("id", id)
      .eq("user_id" as unknown, user.id)
      .single() as unknown;

    if (!strategy) {
      return NextResponse.json(
        { error: "Bot not found or access denied" },
        { status: 404 },
      );
    }

    const validated = parsed.data;

    const { data, error } = await db
      .from("bot_alert_configs")
      .upsert(
        {
          strategy_id: id,
          user_id: user.id,
          drawdown_threshold_pct: validated.drawdownThresholdPct,
          daily_loss_limit_nok: validated.dailyLossLimitNok ?? null,
          notify_on_trade: validated.notifyOnTrade,
          notify_on_error: validated.notifyOnError,
          notification_channels: validated.notificationChannels,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "strategy_id" },
      )
      .select()
      .single() as unknown;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ config: data });
  },
);
