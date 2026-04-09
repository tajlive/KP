import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/utils/error";
import { stripe } from "@/lib/stripe/config";
import { createServerClient, createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 },
      );
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { verified: false, error: "Payment not completed" },
        { status: 400 },
      );
    }

    const response = NextResponse.next();
    const supabaseAuth = createServerClient(request, response);
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    // Grant course access
    const courseId = session.metadata?.courseId;
    if (courseId) {
      const { error } = await supabase.from("user_course_progress").upsert(
        {
          user_id: user.id,
          course_id: courseId,
          progress_percentage: 0,
          completed: false,
          enrolled_at: new Date().toISOString(),
        } as any,
        {
          onConflict: "user_id,course_id",
        },
      );

      if (error) {
        console.error("Failed to grant course access:", error);
      }
    }

    return NextResponse.json({ verified: true });
  } catch (error: unknown) {
    console.error("Session verification error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
