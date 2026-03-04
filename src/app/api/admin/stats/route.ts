import { CAMPAIGN_CONFIG } from "@/lib/campaign-config";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils/error";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Database row types
interface BetaSignupRow {
  source: string | null;
}

interface FunnelEventRow {
  event_type: string;
  session_id: string;
}

// Get environment variables at runtime
function getSupabaseClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://vuxbjlykgmzskxbclquf.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!key) {
    return null;
  }

  return createClient(url, key);
}

export async function GET() {
  // 1. Authenticate user via server client
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ADMIN_EMAILS = ["tomarnejensen@gmail.com", "admin@klarpakke.no"];
  const isWhitelisted = ADMIN_EMAILS.includes(user.email || "");

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isWhitelisted && profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Admin access required" },
      { status: 403 },
    );
  }

  const supabase = getSupabaseClient();

  // If no Supabase connection, return fallback
  if (!supabase) {
    console.info("No Supabase connection, returning fallback data");
    return NextResponse.json({
      totalUsers: CAMPAIGN_CONFIG.CURRENT_REGISTERED,
      totalSignups: CAMPAIGN_CONFIG.CURRENT_REGISTERED,
      signupsToday: 0,
      signupsWeek: 0,
      remaining: CAMPAIGN_CONFIG.SPOTS_LEFT,
      percentage: parseFloat(CAMPAIGN_CONFIG.PERCENT_FILLED),
      clickCount: 0,
      conversionRate: 0,
      paperTradingUsers: 0,
      autoTradingUsers: 0,
      channels: { linkedin: 0, email: 0, facebook: 0, direct: 0 },
      funnel: [],
      is_fallback: true,
      updated_at: new Date().toISOString(),
    });
  }

  try {
    // Get total users from profiles
    const { count: totalUsers, error: userError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (userError) {
      console.error("User count error:", userError);
    }

    // Get total beta signups
    const { count: totalSignups, error: signupError } = await supabase
      .from("beta_signups")
      .select("*", { count: "exact", head: true });

    if (signupError) {
      console.error("Beta signup count error:", signupError);
    }

    // Get today's registrations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: signupsToday, error: todayError } = await supabase
      .from("beta_signups")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    if (todayError) {
      console.error("Today count error:", todayError);
    }

    // Get this week's registrations
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { count: signupsWeek, error: weekError } = await supabase
      .from("beta_signups")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString());

    if (weekError) {
      console.error("Week count error:", weekError);
    }

    // Get channel breakdown
    const { data: channelData, error: channelError } = await supabase
      .from("beta_signups")
      .select("source");

    const typedChannelData = channelData as BetaSignupRow[] | null;

    const channels = {
      linkedin:
        typedChannelData?.filter((u) => u.source === "linkedin").length || 0,
      email: typedChannelData?.filter((u) => u.source === "email").length || 0,
      facebook:
        typedChannelData?.filter((u) => u.source === "facebook").length || 0,
      direct:
        typedChannelData?.filter((u) => !u.source || u.source === "direct")
          .length || 0,
    };

    // Get paper trading users (from canonical trades table)
    const { count: paperTradingUsers, error: paperError } = await supabase
      .from("trades")
      .select("user_id", { count: "exact", head: true })
      .eq("mode", "paper")
      .not("user_id", "is", null);

    if (paperError) {
      console.error("Paper trading count error:", paperError);
    }

    // Get active trading users (from canonical trading_sessions table)
    const { count: autoTradingUsers, error: autoError } = await supabase
      .from("trading_sessions")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "active");

    if (autoError) {
      console.error("Trading sessions count error:", autoError);
    }

    // Get total applications
    const { count: totalApplications, error: appError } = await supabase
      .from("beta_applications")
      .select("*", { count: "exact", head: true });

    if (appError) {
      console.error("Beta application count error:", appError);
    }

    // Get campaign clicks (if table exists)
    let clickCount = 0;
    try {
      const { count: clicks, error: clickError } = await supabase
        .from("campaign_clicks")
        .select("*", { count: "exact", head: true });

      if (!clickError) {
        clickCount = clicks || 0;
      }
    } catch {
      // Table might not exist
    }

    // Calculate conversion rate
    const totalSignupsCount = totalSignups || 0;
    const conversionRate =
      clickCount > 0
        ? parseFloat(((totalSignupsCount / clickCount) * 100).toFixed(1))
        : 0;

    // Get funnel data
    type FunnelStep = {
      name: string;
      label: string;
      uniqueUsers: number;
      dropOff: number;
      dropOffRate: number;
    };
    let funnel: FunnelStep[] = [];
    try {
      const { data: funnelData, error: funnelError } = await supabase
        .from("signup_funnel")
        .select("event_type, session_id")
        .gte("created_at", weekAgo.toISOString());

      if (!funnelError && funnelData) {
        const typedFunnelData = funnelData as FunnelEventRow[];
        const steps = [
          { name: "page_view", label: "Så påmeldingsside" },
          { name: "form_start", label: "Startet utfylling" },
          { name: "erfaring_selected", label: "Valgte erfaring" },
          { name: "laeringsmaal_selected", label: "Valgte læringsmål" },
          { name: "email_entered", label: "Skrev e-post" },
          { name: "submit_attempted", label: "Prøvde å sende" },
          { name: "success", label: "Fullførte påmelding" },
        ];

        funnel = steps.map((step, index) => {
          const uniqueUsers = new Set(
            typedFunnelData
              .filter((s) => s.event_type === step.name)
              .map((s) => s.session_id),
          ).size;

          const prevStep = index > 0 ? steps[index - 1] : null;
          const prevCount = prevStep
            ? new Set(
                typedFunnelData
                  .filter((s) => s.event_type === prevStep.name)
                  .map((s) => s.session_id),
              ).size
            : uniqueUsers;

          const dropOff = prevCount > 0 ? prevCount - uniqueUsers : 0;
          const dropOffRate =
            prevCount > 0 ? ((dropOff / prevCount) * 100).toFixed(1) : "0";

          return {
            ...step,
            uniqueUsers,
            dropOff,
            dropOffRate: parseFloat(dropOffRate),
          };
        });
      }
    } catch {
      // Funnel table might not exist
    }

    const totalUsersCount = totalUsers || 0;
    const remaining = Math.max(0, 100 - totalSignupsCount);
    const percentage = Math.min(100, (totalSignupsCount / 100) * 100);

    console.info("Admin stats:", {
      totalUsers: totalUsersCount,
      totalSignups: totalSignupsCount,
      signupsToday,
      signupsWeek,
      paperTradingUsers,
      autoTradingUsers,
      clickCount,
      conversionRate,
    });

    return NextResponse.json({
      totalUsers: totalUsersCount,
      totalSignups: totalApplications || totalSignupsCount, // Use applications if available, otherwise signups
      totalApplications: totalApplications || 0,
      signupsToday: signupsToday || 0,
      signupsWeek: signupsWeek || 0,
      remaining,
      percentage,
      clickCount,
      conversionRate,
      paperTradingUsers: paperTradingUsers || 0,
      autoTradingUsers: autoTradingUsers || 0,
      channels,
      funnel,
      is_fallback: false,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin stats error:", getErrorMessage(error));

    // Return fallback on error
    return NextResponse.json({
      totalUsers: CAMPAIGN_CONFIG.CURRENT_REGISTERED,
      totalSignups: CAMPAIGN_CONFIG.CURRENT_REGISTERED,
      signupsToday: 0,
      signupsWeek: 0,
      remaining: CAMPAIGN_CONFIG.SPOTS_LEFT,
      percentage: parseFloat(CAMPAIGN_CONFIG.PERCENT_FILLED),
      clickCount: 0,
      conversionRate: 0,
      paperTradingUsers: 0,
      autoTradingUsers: 0,
      channels: { linkedin: 0, email: 0, facebook: 0, direct: 0 },
      funnel: [],
      is_fallback: true,
      error: "Database connection failed",
      updated_at: new Date().toISOString(),
    });
  }
}
