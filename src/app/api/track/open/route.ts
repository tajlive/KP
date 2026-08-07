import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("id");
  const sequence = parseInt(searchParams.get("seq") || "1", 10);

  // Always return pixel, tracking is best-effort
  if (!contactId) {
    return new NextResponse(TRACKING_PIXEL, {
      headers: { "Content-Type": "image/gif" },
    });
  }

  // Check environment variables at runtime
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Silently fail - just return pixel
    return new NextResponse(TRACKING_PIXEL, {
      headers: { "Content-Type": "image/gif" },
    });
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  // TODO: Opprett email_tracking- og campaign_contacts-tabeller i DB — mangler i supabase-typene
  const sb = supabase as unknown as {
    from: (table: string) => {
      insert: (vals: Record<string, unknown>) => Promise<{
        error: { message: string } | null;
      }>;
      update: (vals: Record<string, unknown>) => {
        eq: (
          col: string,
          val: string,
        ) => {
          is: (
            col: string,
            val: null,
          ) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
  };

  try {
    // Logg åpning
    await sb.from("email_tracking").insert({
      contact_id: contactId,
      sequence,
      event: "open",
      user_agent: request.headers.get("user-agent"),
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });

    // Oppdater kontakt status
    await sb
      .from("campaign_contacts")
      .update({ opened_at: new Date().toISOString() })
      .eq("id", contactId)
      .is("opened_at", null);
  } catch (error) {
    console.error("Tracking error:", error);
  }

  // Returner tracking pixel
  return new NextResponse(TRACKING_PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
