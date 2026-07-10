import { createServerClient } from "@/lib/supabase/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface UnsubscribeBody {
  endpoint: string;
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

  const body: UnsubscribeBody = await request.json();

  if (!body.endpoint) {
    return NextResponse.json(
      { error: "Mangler endpoint" },
      { status: 400 },
    );
  }

  // Slett subscription — kun egen
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", body.endpoint)
    .eq("user_id", user.id);

  if (error) {
    console.error("[Push Unsubscribe] Error:", error);
    return NextResponse.json(
      { error: "Kunne ikke slette push-abonnement" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export const POST = withErrorHandler(handlePOST, "/api/notifications/unsubscribe");
