export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

import { createServerClient } from "@/lib/supabase/server";

// POST /api/trading/trigger
// Manually triggers prioritization of user's active sessions for next tick cycle.
// Actual trade execution happens via the tick cron (/api/cron/tick) which runs
// every 5 minutes and processes all active trading_sessions.
async function POSTHandler(request: Request, env: Env)(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabase = createServerClient(request, response);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { 'Content-Type': 'application/json', ..., { status: 401 }.headers || {} }, status: , { status: 401 }.status || 200 });
    }

    const { data: sessions, error: sessError } = await supabase
      .from("trading_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (sessError) throw sessError;
    if (!sessions?.length) {
      return new Response(JSON.stringify({ message: "No active strategies for user" }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Prioritize user's sessions for the next tick by resetting last_tick_at.
    // The tick cron sorts by last_tick_at ASC with nulls first, so this
    // ensures the user's sessions are processed in the upcoming cycle.
    const sessionIds = sessions.map((s) => s.id);
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("trading_sessions")
      .update({ last_tick_at: null, last_heartbeat: now })
      .in("id", sessionIds);

    if (updateError) {
      console.error("[trading/trigger] Failed to prioritize sessions:", updateError);
    }

    return NextResponse.json({
      success: true,
      message: "Sessions prioritized for next tick cycle",
      sessionsPrioritized: sessionIds.length,
    });
  } catch (error) {
    console.error("Trigger error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// GET /api/trading/trigger
// Check trigger status/health
async function GETHandler(request: Request, env: Env)() {
  return NextResponse.json({
    status: "ready",
    endpoint: "POST /api/trading/trigger",
    description: "Prioritize user sessions for next tick cycle",
  });
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
    return new Response('Method not allowed', { status: 405 });
  },
};
