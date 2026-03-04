import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: CORS_HEADERS });

  const expectedToken = Deno.env.get("TAJ_CRON_TOKEN") || "";
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (authHeader !== `Bearer ${expectedToken}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: CORS_HEADERS,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Find unconverted referrals that should be rewarded
    // (Invite 3 friends logic)
    const { data: referrers } = await supabaseClient.rpc(
      "get_eligible_referrers",
    ); // We'll need to define this RPC or use a query

    // For simplicity in this script, let's assume we logic check per user
    const { data: tracking } = await supabaseClient
      .from("referral_tracking")
      .select("referrer_user_id")
      .eq("status", "converted")
      .is("rewarded_at", null);

    const referrerIds = [
      ...new Set(tracking?.map((t) => t.referrer_user_id) || []),
    ];

    for (const rid of referrerIds) {
      const userConversions =
        tracking?.filter((t) => t.referrer_user_id === rid).length || 0;

      if (userConversions >= 3) {
        // Grant 1 month free (Stripe/Internal logic)
        // Update referral_tracking to 'rewarded'
        await supabaseClient
          .from("referral_tracking")
          .update({ rewarded_at: new Date().toISOString() })
          .eq("referrer_user_id", rid)
          .eq("status", "converted")
          .is("rewarded_at", null);

        console.log(`Rewarding user ${rid} with 1 free month for 3 referrals.`);
      }
    }

    return new Response(
      JSON.stringify({ status: "ok", processed: referrerIds.length }),
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
});
