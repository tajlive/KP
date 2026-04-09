import { withRateLimit } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { botActionSchema } from "@/lib/validation/schemas";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

    // strategies har is_active (boolean), ikke status-kolonne
    const isActive = action === "resume";
    const statusLabel =
      action === "resume"
        ? "active"
        : action === "pause"
          ? "paused"
          : "stopped";

    const stratResult = await db
      .from("strategies")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, strategy_type")
      .single();

    const strategy = stratResult.data;
    const stratError = stratResult.error;

    if (!strategy) {
      return NextResponse.json(
        { error: "Bot not found or access denied" },
        { status: 404 },
      );
    }
    if (stratError) {
      return NextResponse.json({ error: stratError.message }, { status: 500 });
    }

    // trading_sessions: strategy_id er korrekt FK (config_id finnes ikke i schema)
    const sessionStatusMap: { [key: string]: string } = {
      pause: "PAUSED",
      resume: "ACTIVE",
      stop: "STOPPED",
    };

    const sessionResult = await db
      .from("trading_sessions")
      .select("id")
      .eq("strategy_id", id)
      .eq("status", "active")
      .single();

    const session = sessionResult.data;

    await db
      .from("trading_sessions")
      .update({
        status: sessionStatusMap[action],
        ...(action === "stop" ? { stopped_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("strategy_id", id)
      .eq("status", "active");

    if (session?.id) {
      await db.from("strategy_logs").insert({
        session_id: session.id,
        strategy_id: id,
        strategy_type: strategy.strategy_type ?? "unknown",
        status: `bot_${action}`,
      });
    }

    return NextResponse.json({
      success: true,
      strategy: { id, status: statusLabel },
    });
  },
);
