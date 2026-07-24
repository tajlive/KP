import { requireAdmin } from "@/lib/admin/require-admin";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/admin/cta-analytics?days=N — CTA-klikk aggregert (admin marketing).
 *
 * KLA-auth: CtaAnalyticsDashboard leste marketing_cta_events via
 * browser-supabase (alltid anon — stille tomt). Aggregasjonen flyttet
 * hit (marketing_funnel_summary-viewet finnes ikke i DB — kun raa-events).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.status === 401 ? "Ikke innlogget" : "Ingen tilgang" },
      { status: auth.status },
    );
  }

  const daysParam = Number(request.nextUrl.searchParams.get("days") ?? "30");
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 365) : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: events, error } = await auth.supabase
    .from("marketing_cta_events")
    .select("tracking_id, route, locale, experiment_key, variant_key, funnel_stage, user_id")
    .gte("created_at", since);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const aggregates = (events ?? []).reduce(
    (acc, e) => {
      const key = `${e.tracking_id}-${e.route}-${e.locale}`;
      if (!acc[key]) {
        acc[key] = {
          tracking_id: e.tracking_id as string,
          route: e.route as string,
          total_clicks: 0,
          unique_users: new Set<string>(),
          locale: e.locale as string,
          experiment_key: (e.experiment_key as string | null) ?? null,
          variant_key: (e.variant_key as string | null) ?? null,
          funnel_stage: (e.funnel_stage as string | null) || "general",
        };
      }
      acc[key].total_clicks++;
      if (e.user_id) acc[key].unique_users.add(e.user_id as string);
      return acc;
    },
    {} as Record<
      string,
      {
        tracking_id: string;
        route: string;
        total_clicks: number;
        unique_users: Set<string>;
        locale: string;
        experiment_key: string | null;
        variant_key: string | null;
        funnel_stage: string;
      }
    >,
  );

  const data = Object.values(aggregates).map((item) => ({
    tracking_id: item.tracking_id,
    route: item.route,
    total_clicks: item.total_clicks,
    unique_users: item.unique_users.size,
    locale: item.locale,
    experiment_key: item.experiment_key,
    variant_key: item.variant_key,
    funnel_stage: item.funnel_stage,
  }));

  return NextResponse.json({ ok: true, data });
}
