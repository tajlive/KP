/**
 * Marketing CTA Analytics Admin Page
 *
 * Shows aggregated CTA click data for conversion optimization.
 * Admin-only access required.
 */

import { Metadata } from "next";
import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { AccessDenied } from "@/shared/ui/AccessDenied";
import { createServerClient } from "@/lib/supabase/server";
import { CtaAnalyticsDashboard } from "./CtaAnalyticsDashboard";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Marketing CTA Analytics - Klarpakke",
    robots: { index: false, follow: false },
  };
}

// Admin check
async function checkAdminAccess() {
  const supabase = await createServerClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    // Check if user has admin tier (professor)
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("tier")
      .eq("id", user.id)
      .single();

    return profile?.tier === "professor";
  } catch {
    return false;
  }
}

interface CtaEvent {
  tracking_id: string;
  route: string;
  locale: string;
  experiment_key: string | null;
  variant_key: string | null;
  user_id: string | null;
}

export default async function MarketingCtaAdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { user } = await requireAuth(locale);
  if (!user) {
    return <LoginRequired next={`/${locale}/admin/marketing/ctas`} />;
  }

  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return <AccessDenied next={`/${locale}/admin/marketing/ctas`} />;
  }

  // Fetch initial data
  const supabase = await createServerClient();

  // Fetch data via query (table types will be generated with db:gen-types)
  const { data: events } = await supabase
    .from("marketing_cta_events" as "user_profiles")
    .select("tracking_id, route, locale, experiment_key, variant_key, user_id")
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .returns<CtaEvent[]>();

  // Aggregate manually
  const aggregates = (events || []).reduce((acc, event) => {
    const key = `${event.tracking_id}-${event.route}-${event.locale}`;
    if (!acc[key]) {
      acc[key] = {
        tracking_id: event.tracking_id,
        route: event.route,
        total_clicks: 0,
        unique_users: new Set<string>(),
        locale: event.locale,
        experiment_key: event.experiment_key,
        variant_key: event.variant_key,
      };
    }
    acc[key].total_clicks++;
    if (event.user_id) {
      acc[key].unique_users.add(event.user_id);
    }
    return acc;
  }, {} as Record<string, {
    tracking_id: string;
    route: string;
    total_clicks: number;
    unique_users: Set<string>;
    locale: string;
    experiment_key: string | null;
    variant_key: string | null;
  }>);

  const formattedData = Object.values(aggregates).map(item => ({
    tracking_id: item.tracking_id,
    route: item.route,
    total_clicks: item.total_clicks,
    unique_users: item.unique_users.size,
    locale: item.locale,
    experiment_key: item.experiment_key,
    variant_key: item.variant_key,
  }));

  return <CtaAnalyticsDashboard initialData={formattedData} />;
}
