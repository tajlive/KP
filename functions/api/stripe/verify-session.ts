export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

import { getErrorMessage } from "@/lib/utils/error";
import { stripe } from "@/lib/stripe/config";
import { createServerClient, createClient } from "@/lib/supabase/server";

async function POSTHandler(request: Request, env: Env)(request: NextRequest) {
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { 'Content-Type': 'application/json', ..., { status: 401 }.headers || {} }, status: , { status: 401 }.status || 200 });
    }

    // Supabase REST API will be used directly via fetch

    // Grant course access
    const courseId = session.metadata?.courseId;
    if (courseId) {
      const { error } = await supabase.from("user_course_progress").upsert(
        {
          user_id: user.id,
          course_id: courseId,
          progress_percent: 0,
          is_completed: false,
          started_at: new Date().toISOString(),
        } as never,
        {
          onConflict: "user_id,course_id",
        },
      );

      if (error) {
        console.error("Failed to grant course access:", error);
      }
    }

    return new Response(JSON.stringify({ verified: true });
  } catch (error: unknown), { headers: { 'Content-Type': 'application/json' } }) {
    console.error("Session verification error:", error);
    return new Response(JSON.stringify(
      { error: getErrorMessage(error), { headers: { 'Content-Type': 'application/json' } }) },
      { status: 500 },
    );
  }
}


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const method = request.method;
    if (method === 'POST') {
      return POSTHandler(request, env);
    }
    return new Response('Method not allowed', { status: 405 });
  },
};
