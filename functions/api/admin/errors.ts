export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

import { isEmailOnServerAdminAllowlist } from "@/lib/admin/admin-allowlist.server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key);
}

async function GETHandler(request: Request, env: Env)(request: Request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return new Response(JSON.stringify({ error: "Service unavailable" }), { headers: { 'Content-Type': 'application/json', ..., { status: 503 }.headers || {} }, status: , { status: 503 }.status || 200 });
  }

  try {
    // Verify admin
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { 'Content-Type': 'application/json', ..., { status: 401 }.headers || {} }, status: , { status: 401 }.status || 200 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { 'Content-Type': 'application/json', ..., { status: 401 }.headers || {} }, status: , { status: 401 }.status || 200 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const allowlisted = isEmailOnServerAdminAllowlist(user.email);
    if (!allowlisted && profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), { headers: { 'Content-Type': 'application/json', ..., { status: 403 }.headers || {} }, status: , { status: 403 }.status || 200 });
    }

    // Get errors (last 24h)
    const { data: errors, error: errorsError } = await supabase
      .from("client_errors")
      .select("*")
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (errorsError) throw errorsError;

    // Get stats
    const { data: statsData, error: statsError } = await supabase.rpc(
      "get_error_stats",
      { p_hours: 24 },
    );

    if (statsError) throw statsError;

    return NextResponse.json({
      errors: errors || [],
      stats: statsData?.[0] || null,
    });
  } catch (err) {
    console.error("Admin errors API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
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
