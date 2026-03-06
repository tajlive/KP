import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    // 1. Authenticate user using cookie-based client
    const authClient = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Verify admin role
    const { data: profile } = await authClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Require Admin Role" },
        { status: 403 },
      );
    }

    // 3. Create service role client to bypass RLS for sessions
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Fetch all trading sessions
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

    return NextResponse.json({ sessions, success: true });
  } catch (error) {
    console.error("Admin sessions error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await authClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Require Admin Role" },
        { status: 403 },
      );
    }

    const { sessionId, action } = await request.json();

    if (!sessionId || !["stop", "pause", "resume"].includes(action)) {
      return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const updates: Record<string, string> =
      action === "stop"
        ? { status: "stopped", stopped_at: new Date().toISOString() }
        : action === "pause"
          ? { status: "paused" }
          : { status: "active" }; // resume

    const { error } = await serviceClient
      .from("trading_sessions")
      .update(updates)
      .eq("id", sessionId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Session ${action}ped remotely.`,
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
