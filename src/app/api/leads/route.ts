import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LeadSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    const { email } = parsed.data;

    try {
      const supabase = await createClient();
      await supabase
        .from("leads")
        .upsert({ email, source: "landing_email_capture" }, { onConflict: "email" });
    } catch {
      // DB insert is best-effort — don't fail the request
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Bad request" },
      { status: 400 },
    );
  }
}
