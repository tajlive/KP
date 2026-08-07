import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const analyticsEventSchema = z.object({
  session_id: z.string().nullable().optional(),
  user_id: z.string().nullable().optional(),
  event_type: z.string().default("page_view"),
  event_name: z.string().nullable().optional(),
  page_path: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = analyticsEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { session_id, user_id, event_type, event_name, page_path } =
      parsed.data;

    const supabase = createClient();

    // TODO: Opprett analytics_events-tabell i DB — mangler i supabase-typene
    const sb = supabase as unknown as {
      from: (table: string) => {
        insert: (vals: Record<string, unknown>) => Promise<{
          error: { message: string } | null;
        }>;
      };
    };

    // Insert event - event_name derived from event_type or page_path if not provided
    await sb.from("analytics_events").insert({
      user_id: user_id ?? null,
      session_id: session_id ?? null,
      event_type: event_type ?? "page_view",
      event_name: event_name ?? page_path ?? "unknown",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics event error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
