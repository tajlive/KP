import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Tillatte notification types (matcher DB enum)
const VALID_TYPES = [
  "trade_executed",
  "leaderboard_change",
  "achievement",
  "weekly_summary",
  "signal_new",
  "signal_executed",
  "price_alert",
  "subscription_expiring",
  "subscription_expired",
  "achievement_unlocked",
  "leaderboard_update",
  "system",
  "system_alert",
  "security_alert",
] as const;

type NotificationType = (typeof VALID_TYPES)[number];

// ============================================================
// GET — Hent siste 10 notifikasjoner for innlogget bruker
// ============================================================
async function handleGET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(request, response);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Hent siste 10 notifikasjoner
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, is_read, data, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[Notifications] GET error:", error);
    return NextResponse.json(
      { error: "Kunne ikke hente notifikasjoner" },
      { status: 500 },
    );
  }

  // Tell uleste
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return NextResponse.json({
    notifications: data ?? [],
    unreadCount: unreadCount ?? 0,
  });
}

// ============================================================
// POST (internal) — Opprett notifikasjon (kalles av SmartTrader,
// leaderboard-endringer, achievements, etc.)
// ============================================================
async function handlePOST(request: NextRequest) {
  // Sjekk CRON_SECRET for internal kall
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Tillat service_role (Supabase internal) og CRON_SECRET
  const isServiceRole =
    authHeader?.startsWith("Bearer ") &&
    authHeader.slice(7) === process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isCronJob = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isServiceRole && !isCronJob) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: {
    user_id: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  } = await request.json();

  // Valider obligatoriske felt
  if (!body.user_id || !body.type || !body.title || !body.body) {
    return NextResponse.json(
      { error: "Mangler påkrevde felt: user_id, type, title, body" },
      { status: 400 },
    );
  }

  // Valider type
  if (!VALID_TYPES.includes(body.type as NotificationType)) {
    return NextResponse.json(
      {
        error: `Ugyldig notification type. Tillatte: ${VALID_TYPES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Opprett via service client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Serverkonfigurasjonsfeil" },
      { status: 500 },
    );
  }

  const supabase = createSupabaseServiceClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: body.user_id,
      type: body.type,
      title: body.title,
      body: body.body,
      data: body.data ?? {},
      is_read: false,
      read: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Notifications] POST error:", error);
    return NextResponse.json(
      { error: "Kunne ikke opprette notifikasjon" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, notification_id: data?.id },
    { status: 201 },
  );
}

export const GET = withErrorHandler(handleGET, "/api/notifications");
export const POST = withErrorHandler(handlePOST, "/api/notifications");
