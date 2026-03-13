import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/trading/trigger
// Manually triggers the strategy runner (for immediate feedback when user starts a strategy)
export async function POST(_: NextRequest) {
  try {
    const supabase: unknown = (await createClient()) as unknown;

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's active strategies
    const { data: strategies, error: stratError } = await supabase
      .from("strategies" as unknown)
      .select("*")
      .eq("user_id" as unknown, user.id)
      .eq("is_active", true);

    if (stratError) throw stratError;
    if (!strategies?.length) {
      return NextResponse.json({ message: "No active strategies for user" });
    }

    // Call the Edge Function using the validated user's context
    const {
      data: { session },
    } = await supabase.auth.getSession(); // Still needed for the access_token to pass to Edge Function
    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/strategy-runner`;

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session?.access_token || process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Edge function error: ${error}`);
    }

    const result = await response.json();

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
