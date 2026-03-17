import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { subscription } = await request.json();

    if (!subscription?.endpoint || !subscription?.keys) {
      return NextResponse.json(
        { error: "Invalid subscription" },
        { status: 400 }
      );
    }

    const response = NextResponse.next();
    const supabase = createServerClient(request, response);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createClient();
    const { error } = await admin.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

    if (error) {
      console.error("Error saving push subscription:", error);
      return NextResponse.json(
        { error: "Failed to save subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
