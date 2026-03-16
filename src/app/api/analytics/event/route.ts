import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, user_id, event_type, event_name, page_path } = body ?? {};

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const effectiveType = typeof event_type === "string" && event_type.length > 0 ? event_type : "page_view";
    const effectiveName =
      typeof event_name === "string" && event_name.length > 0
        ? event_name
        : typeof page_path === "string" && page_path.length > 0
          ? page_path
          : "unknown";

    // Insert event - event_name derived from event_type or page_path if not provided
    await supabase.from("analytics_events").insert({
      user_id: user_id ?? user.id,
      session_id: session_id ?? null,
      event_type: effectiveType,
      event_name: effectiveName,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics event error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
