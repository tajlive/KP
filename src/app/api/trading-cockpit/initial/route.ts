import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { getCockpitInitialData } from "@/features/trading-cockpit/server/getCockpitInitialData";
import { z } from "zod";

const paramsSchema = z.object({
  mode: z.enum(["paper", "live"]).optional(),
  tab: z.enum(["overview", "trades", "analysis"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth("no");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = paramsSchema.safeParse({
      mode: searchParams.get("mode") ?? undefined,
      tab: searchParams.get("tab") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid params", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { mode, tab } = parsed.data;
    const data = await getCockpitInitialData(
      user.id,
      mode ?? null,
      tab ?? null,
    );

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[trading-cockpit/initial]", error);
    return NextResponse.json(
      { error: "Could not fetch cockpit data" },
      { status: 500 },
    );
  }
}
