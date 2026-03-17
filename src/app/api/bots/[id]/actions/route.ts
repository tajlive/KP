import { withRateLimit } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { botActionSchema } from "@/lib/validation/schemas";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/bots/[id]/actions
 * Body: { action: 'pause' | 'resume' | 'stop' }
 * Auth: JWT required + ownership verified
 * Rate limit: 10 req/min per user
 */
export const POST = withRateLimit(
  10,
  60_000,
  async (req: NextRequest, { user }) => {
    const url = new URL(req.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.indexOf("bots") + 1];

    const body = await req.json();
    const parsed = botActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid action. Must be pause, resume, or stop.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { action } = parsed.data;
    const db = createClient();

    const statusMap: Record<string, string> = {
      pause: "paused",
      resume: "active",
      stop: "stopped",
    };
    const newStatus = statusMap[action];

    // Ownership check: only allow actions on own bots
    const { data: strategy, error: stratError } = await db
      .from("strategies")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, status, strategy_type")
      .single();

    if (!strategy) {
      return NextResponse.json(
        { error: "Bot not found or access denied" },
        { status: 404 },
      );
    }

    if (stratError) {
      return NextResponse.json({ error: (stratError as Error).message }, { status: 500 });
    }

    // Update corresponding session status
    const sessionStatusMap: Record<string, string> = {
      pause: "PAUSED",
      resume: "ACTIVE",
      stop: "STOPPED",
    };

    // Get session for logging
    const { data: session } = await db
      .from("trading_sessions")
      .select("id")
      .eq("config_id", id)
      .eq("status", "ACTIVE")
      .single();

    await db
      .from("trading_sessions")
      .update({
        status: sessionStatusMap[action],
        ...(action === "pause"
          ? { paused_at: new Date().toISOString(), pause_reason: "User action" }
          : {}),
        ...(action === "stop"
          ? { stopped_at: new Date().toISOString(), stop_reason: "User action" }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("config_id", id)
      .eq("status", "ACTIVE");

    // Log the action (only if we have a session)
    if (session?.id) {
      await db.from("strategy_logs").insert({
        session_id: session.id,
        strategy_id: id,
        strategy_type: (strategy as { strategy_type?: string }).strategy_type ?? "unknown",
        status: `bot_${action}`,
      });
    }

    return NextResponse.json({
      success: true,
      strategy: { id, status: newStatus },
    });
  },
);
