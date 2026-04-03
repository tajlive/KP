import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/trading/trigger
// Manually triggers the strategy runner (for immediate feedback when user starts a strategy)
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabase = createServerClient(request, response);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: sessions, error: sessError } = await supabase
      .from("trading_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (sessError) throw sessError;
    if (!sessions?.length) {
      return NextResponse.json({ message: "No active strategies for user" });
    }

    // Call the Edge Function using the validated user's access token
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/strategy-runner`;

    const edgeResponse = await fetch(functionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!edgeResponse.ok) {
      const error = await edgeResponse.text();
      throw new Error(`Edge function error: ${error}`);
    }

    const result = await edgeResponse.json();

    return NextResponse.json({
      success: true,
      message: "Strategy runner triggered",
      result,
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
export async function GET() {
  return NextResponse.json({
    status: "ready",
    endpoint: "POST /api/trading/trigger",
    description: "Manually trigger strategy runner for immediate execution",
  });
}
