import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const revalidate = 30;

export async function GET(_request: NextRequest) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("global_settings")
      .select("usdt_nok_rate,updated_at")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rate = Number(data?.usdt_nok_rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return NextResponse.json(
        { error: "Missing USDT/NOK rate" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        rate,
        updatedAt: data?.updated_at ?? null,
        source: "global_settings",
      },
      {
        headers: {
          // FX changes slower than prices; safe to CDN-cache briefly
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
        },
      },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
