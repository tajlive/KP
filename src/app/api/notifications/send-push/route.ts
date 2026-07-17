import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";
import { withErrorHandler } from "@/lib/api-error-handler";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_TYPES = [
  "trade_executed",
  "leaderboard_change",
  "achievement",
  "weekly_summary",
] as const;

async function handlePOST(request: NextRequest) {
  // Sjekk autorisasjon
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

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

  if (!body.user_id || !body.title || !body.body) {
    return NextResponse.json(
      { error: "Mangler påkrevde felt: user_id, title, body" },
      { status: 400 },
    );
  }

  if (body.type && !VALID_TYPES.includes(body.type as (typeof VALID_TYPES)[number])) {
    return NextResponse.json(
      { error: `Ugyldig type. Tillatte: ${VALID_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  // Hent push subscriptions for brukeren
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

  const { data: subscriptions, error: fetchError } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", body.user_id);

  if (fetchError) {
    console.error("[Send Push] Fetch error:", fetchError);
    return NextResponse.json(
      { error: "Kunne ikke hente abonnementer" },
      { status: 500 },
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      message: "Ingen push-abonnementer funnet for brukeren",
    });
  }

  // Send push til alle enheter
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidPrivateKey || !vapidPublicKey) {
    console.warn("[Send Push] VAPID keys not configured — skipping push");
    return NextResponse.json({
      ok: true,
      sent: 0,
      message: "VAPID-nøkler ikke konfigurert",
    });
  }

  const payload = JSON.stringify({
    title: body.title,
    body: body.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-72x72.png",
    url: body.type === "trade_executed" ? "/trade" :
         body.type === "leaderboard_change" ? "/dashboard" :
         body.type === "achievement" ? "/dashboard" :
         body.type === "weekly_summary" ? "/dashboard" : "/",
    tag: `klarpakke-${body.type}`,
    timestamp: Date.now(),
    data: body.data ?? {},
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      const response = await pushNotification(
        sub.endpoint,
        sub.p256dh,
        sub.auth,
        payload,
        vapidPublicKey,
        vapidPrivateKey,
      );

      if (response.ok) {
        sent++;
      } else if (response.status === 410) {
        // Subscription expired — slett den
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
        failed++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error("[Send Push] Failed to send:", err);
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    total: subscriptions.length,
  });
}

/**
 * Send Web Push notification via Web Push API (HTTP/2)
 * Bruker VAPID for autentisering mot push service
 */
async function pushNotification(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
): Promise<Response> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  // Konstruer VAPID JWT
  const header = btoa(
    JSON.stringify({
      typ: "JWT",
      alg: "ES256",
    }),
  );

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = btoa(
    JSON.stringify({
      aud: audience,
      exp: now + 86400, // 24 timer
      sub: `mailto:team@klarpakke.no`,
    }),
  );

  // For ES256 signering trenger vi en crypto-subtle operasjon.
  // Fallback til å bruke web-push library dersom tilgjengelig.
  // For nå sender vi via Supabase Edge Function hvis tilgjengelig.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl) {
    // Bruk en Edge Function for push sending (håndterer VAPID-signering)
    const res = await fetch(
      `${supabaseUrl}/functions/v1/send-push`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          endpoint,
          p256dh,
          auth,
          payload,
          vapidPublicKey,
          vapidPrivateKey,
        }),
        signal: AbortSignal.timeout(5000),
      },
    );
    return res;
  }

  throw new Error("No push delivery method configured");
}

export const POST = withErrorHandler(handlePOST, "/api/notifications/send-push");
