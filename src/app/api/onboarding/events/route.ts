import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createClient as createServiceClient,
  createServerClient,
} from "@/lib/supabase/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import type { Json } from "@/types/database.types";

/**
 * POST /api/onboarding/events
 *
 * Logger onboarding-funnel-events til onboarding_events.
 * RLS tillater kun service-role INSERT — derfor via API, ikke klient.
 * Dedup per (user_id, step): samme steg logges kun én gang per bruker.
 */

const eventSchema = z.object({
  step: z.enum([
    "checklist_viewed",
    "first_trade_completed",
    "history_viewed",
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const response = NextResponse.next();
  const serverClient = createServerClient(request, response);
  const {
    data: { user },
    error: authError,
  } = await serverClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const body = eventSchema.parse(await request.json());
  const supabase = createServiceClient();

  // Dedup: hopp over om steget allerede er logget for brukeren
  const { data: existing } = await supabase
    .from("onboarding_events")
    .select("id")
    .eq("user_id", user.id)
    .eq("step", body.step)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  const { error } = await supabase.from("onboarding_events").insert({
    user_id: user.id,
    step: body.step,
    completed_at: new Date().toISOString(),
    metadata: (body.metadata ?? {}) as Json,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});
