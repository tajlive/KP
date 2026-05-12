export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

/**
 * POST /api/ai/autopilot/stop
 * Stopper autopiloten permanent — lukker alle posisjoner.
 */

import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function POSTHandler(request: Request, env: Env)(req: NextRequest) {
  const res = NextResponse.next();
  const db = createServerClient(req, res);

  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { 'Content-Type': 'application/json', ..., { status: 401 }.headers || {} }, status: , { status: 401 }.status || 200 });
  }

  try {
    const now = new Date().toISOString();

    // Stop autopilot config
    await db
      .from("ai_autopilot_configs")
      .update({ status: "stopped", updated_at: now })
      .eq("user_id", user.id);

    // Stop all paper sessions
    await db
      .from("trading_sessions")
      .update({
        status: "stopped",
        last_status_message: "Autopilot stopped by user",
        updated_at: now,
      })
      .eq("user_id", user.id)
      .eq("mode", "paper")
      .in("status", ["active", "paused"]);

    return NextResponse.json({ ok: true, message: "Autopilot stopped" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { headers: { 'Content-Type': 'application/json', ..., { status: 500 }.headers || {} }, status: , { status: 500 }.status || 200 });
  }
}


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const method = request.method;
    if (method === 'POST') {
      return POSTHandler(request, env);
    }
    return new Response('Method not allowed', { status: 405 });
  },
};
