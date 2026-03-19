import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const analyticsTrackSchema = z.object({
  session_id: z.string().nullable().optional(),
  user_id: z.string().nullable().optional(),
  page_path: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = analyticsTrackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { session_id, user_id, page_path } = parsed.data;

    const supabase = createClient();

    // Track page view as analytics event
    await supabase.from("analytics_events").insert({
      user_id: user_id ?? null,
      session_id: session_id ?? null,
      event_type: "page_view",
      event_name: page_path ?? "unknown",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics track error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
