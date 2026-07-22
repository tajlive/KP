import { createServerClient } from "@/lib/supabase/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PushSubscriptionBody {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
}

async function handlePOST(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: PushSubscriptionBody = await request.json();

  if (!body.subscription?.endpoint || !body.subscription?.keys) {
    return NextResponse.json(
      { error: "Ugyldig push subscription data" },
      { status: 400 },
    );
  }

  // Upsert subscription (én per endpoint)
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: body.subscription.endpoint,
      p256dh: body.subscription.keys.p256dh,
      auth: body.subscription.keys.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    console.error("[Push Subscribe] Error:", error);
    return NextResponse.json(
      { error: "Kunne ikke lagre push-abonnement" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export const POST = withErrorHandler(handlePOST, "/api/notifications/subscribe");
