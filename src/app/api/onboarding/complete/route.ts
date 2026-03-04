// ============================================================================
// POST /api/onboarding/complete
// KLA-98: Complete the onboarding process for a user
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OnboardingCompleteSchema = z.object({
  strategyId: z.string().uuid().optional(),
});

export interface OnboardingCompleteResponse {
  success: boolean;
  message: string;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<OnboardingCompleteResponse | { error: string }>> {
  try {
    const response = NextResponse.next();
    const supabase = createServerClient(request, response);

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please provide a valid authentication token." },
        { status: 401 },
      );
    }

    const userId = user.id;

    // Parse request body (optional strategyId)
    const body = await request.json().catch(() => ({}));
    const parsed = OnboardingCompleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { strategyId } = parsed.data;

    // Update onboarding_progress to mark as completed
    const { error: progressError } = await supabase
      .from("onboarding_progress")
      .upsert(
        {
          user_id: userId,
          current_step: 4,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (progressError) {
      console.error("Failed to update onboarding progress:", progressError);
    }

    // Update profiles to mark onboarding as completed
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
        onboarding_step: "complete",
        setup_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      // Try user_profiles as fallback
      const { error: userProfileError } = await supabase
        .from("user_profiles")
        .update({
          onboarding_completed: true,
          setup_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (userProfileError) {
        console.error("Failed to update profile:", userProfileError);
      }
    }

    // If a strategyId was provided, ensure it's activated
    if (strategyId) {
      // Try user_strategies first
      const { error: strategyError } = await supabase
        .from("user_strategies")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", strategyId)
        .eq("user_id", userId);

      if (strategyError) {
        // Fallback to trading_sessions
        await supabase
          .from("trading_sessions")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", strategyId)
          .eq("user_id", userId);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
    });
  } catch (error) {
    console.error("Error in /api/onboarding/complete:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
