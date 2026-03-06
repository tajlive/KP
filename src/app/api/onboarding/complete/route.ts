import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("user_profiles")
    .update({
      onboarding_completed: true,
      onboarding_step: 5,
      setup_completed_at: now,
      onboarding_completed_at: now,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Set cookie to skip DB checks in middleware
  (await cookies()).set("kp_onboarding_status", "completed", {
    path: "/",
    maxAge: 3600 * 24 * 30, // 30 days
    sameSite: "lax",
  });

  return NextResponse.json({ success: true, redirectTo: "/dashboard" });
}
