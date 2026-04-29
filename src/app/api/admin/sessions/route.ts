import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const auth = await verifyAdminAccess();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
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
    const auth = await verifyAdminAccess();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { sessionId, action } = await request.json();

    if (!sessionId || !["stop", "pause", "resume"].includes(action)) {
      return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
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
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
