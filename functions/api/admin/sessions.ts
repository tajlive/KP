export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { createClient } from "@supabase/supabase-js";

async function GETHandler(request: Request, env: Env)() {
  try {
    const auth = await verifyAdminAccess();
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), { headers: { 'Content-Type': 'application/json', ..., { status: auth.status }.headers || {} }, status: , { status: auth.status }.status || 200 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: sessions, error } = await serviceClient
      .from("trading_sessions")
      .select(
        `
        *,
        user_profiles (
          id,
          display_name,
          tier
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching admin sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 },
      );
    }

    const sessionsWithComputedPnl = (sessions || []).map((s: Record<string, unknown>) => ({
      ...s,
      total_pnl:
        (Number(s.current_capital_nok ?? s.current_capital ?? 0) -
          Number(s.starting_capital_nok ?? s.initial_capital ?? 0)),
    }));
    return NextResponse.json({ sessions: sessionsWithComputedPnl, success: true });
  } catch (error) {
    console.error("Admin sessions error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

async function POSTHandler(request: Request, env: Env)(request: NextRequest) {
  try {
    const auth = await verifyAdminAccess();
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), { headers: { 'Content-Type': 'application/json', ..., { status: auth.status }.headers || {} }, status: , { status: auth.status }.status || 200 });
    }

    const { sessionId, action } = await request.json();

    if (!sessionId || !["stop", "pause", "resume"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid operation" }), { headers: { 'Content-Type': 'application/json', ..., { status: 400 }.headers || {} }, status: , { status: 400 }.status || 200 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const updates: Record<string, unknown> =
      action === "stop"
        ? { status: "stopped", stopped_at: new Date().toISOString(), archived: true, archived_at: new Date().toISOString() }
        : action === "pause"
          ? { status: "paused" }
          : { status: "active" };

    const { error } = await serviceClient
      .from("trading_sessions")
      .update(updates).eq("id", sessionId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Session ${action}ped remotely.`,
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return new Response(JSON.stringify({ error: err.message }), { headers: { 'Content-Type': 'application/json', ..., { status: 500 }.headers || {} }, status: , { status: 500 }.status || 200 });
    }
    return new Response(JSON.stringify({ error: "Unknown error" }), { headers: { 'Content-Type': 'application/json', ..., { status: 500 }.headers || {} }, status: , { status: 500 }.status || 200 });
  }
}


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const method = request.method;
    if (method === 'GET') {
      return GETHandler(request, env);
    }
    return new Response('Method not allowed', { status: 405 });
  },
};
