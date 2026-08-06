import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getErrorMessage } from "@/lib/utils/error";

export async function GET() {
  // P0-fiks (2026-08-06): ruten var ubeskyttet — service-role-klient + anon-
  // fallback eksponerte påmeldingsstatistikk anonymt. requireAdmin verifiserer
  // cookie-sesjon + admin-allowlist før data-tilgang.
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }
  const supabase = auth.supabase;

  try {
    // Get total signups from beta_signups table (the actual campaign registrations)
    const { count: total, error: countError } = await supabase
      .from("beta_signups")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Count error:", countError);
      throw countError;
    }

    // Get today's registrations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayCount, error: todayError } = await supabase
      .from("beta_signups")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    if (todayError) {
      console.error("Today count error:", todayError);
    }

    // Get this week's registrations
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { count: weekCount, error: weekError } = await supabase
      .from("beta_signups")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString());

    if (weekError) {
      console.error("Week count error:", weekError);
    }

    // TODO: beta_signups har ikke source-kolonne — utelat kanalnedbrytning inntil kolonnen er på plass
    const channels = { linkedin: 0, email: 0, facebook: 0, direct: total || 0 };

    const totalUsers = total || 0;
    const remaining = Math.max(0, 100 - totalUsers);
    const percentage = Math.min(100, (totalUsers / 100) * 100);
    return NextResponse.json({
      total: totalUsers,
      today: todayCount || 0,
      week: weekCount || 0,
      remaining,
      percentage,
      channels,
      email: { sent: 0, opened: 0, clicked: 0 },
      is_fallback: false,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Dashboard stats error:", getErrorMessage(error));

    // Return fallback on error — men uten å lekke admin-data anonymt
    return NextResponse.json(
      {
        error: "Database connection failed",
      },
      { status: 503 },
    );
  }
}
