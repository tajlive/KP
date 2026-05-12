export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

import { isEmailOnServerAdminAllowlist } from "@/lib/admin/admin-allowlist.server";
import type { Database } from "@/types/database.types";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient(): ReturnType<typeof createClient<Database>> | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://vuxbjlykgmzskxbclquf.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!key) return null;
  return createClient<Database>(url, key);
}

async function GETHandler(request: Request, env: Env)(request: Request) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      {
        isAdmin: false,
        error: "Database connection failed",
      },
      { status: 503 },
    );
  }

  try {
    // Get auth token from header
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        {
          isAdmin: false,
          error: "No authorization header",
        },
        { status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify the user
    const {
      data: { user },
      error: authError,
    } = await supabase!.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        {
          isAdmin: false,
          error: "Invalid token",
        },
        { status: 401 },
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase!
      .from("user_profiles")
      .select("role, email, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          isAdmin: false,
          error: "Profile not found",
        },
        { status: 404 },
      );
    }

    const isAdmin =
      profile.role === "admin" ||
      isEmailOnServerAdminAllowlist(user.email ?? profile.email ?? undefined);

    return NextResponse.json({
      isAdmin,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
    });
  } catch (error) {
    console.error("Admin verify error:", error);
    return NextResponse.json(
      {
        isAdmin: false,
        error: "Internal server error",
      },
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
