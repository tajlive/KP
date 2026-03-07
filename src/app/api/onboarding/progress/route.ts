import { withAuth } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/onboarding/progress — Retrieve user's onboarding progress
 * Auth: JWT required
 */
export const GET = withAuth(async (_req: NextRequest, { user }) => {
  const db = await createClient();

  const { data, error } = await db
    .from("onboarding_progress")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ progress: data });
});

/**
 * PUT /api/onboarding/progress — Save onboarding progress
 * Auth: JWT required
 */
export const PUT = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json();
  const db = await createClient();

  const { data, error } = await db
    .from("onboarding_progress")
    .upsert(
      {
        user_id: user.id,
        current_step: body.currentStep,
        completed_steps: body.completedSteps,
        risk_profile: body.riskProfile,
        selected_template: body.selectedTemplate,
        paper_trade_completed: body.paperTradeCompleted ?? false,
        completed_at:
          body.currentStep === "completion" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ progress: data });
});
