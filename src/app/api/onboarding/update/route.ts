import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  step: z.number().min(1).max(5),
  trading_experience: z.enum(['beginner', 'intermediate', 'experienced', 'expert']).optional(),
  preferred_trading_mode: z.enum(['paper', 'live']).optional(),
  risk_tolerance: z.enum(['low', 'medium', 'high']).optional(),
});

export async function POST(request: Request) {
  const supabase = (await createClient()) as unknown;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const validation = updateSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid data", details: validation.error },
      { status: 400 }
    );
  }

  const { step, ...profileData } = validation.data;

  const { error } = await supabase
    .from("user_profiles")
    .update({
      onboarding_step: step,
      ...profileData,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, step });
}
