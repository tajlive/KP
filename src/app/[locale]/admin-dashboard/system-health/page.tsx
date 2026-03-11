import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SystemHealthClient } from "./SystemHealthClient";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

// Fallback UI for når datahenting feiler
function SystemHealthErrorFallback({ locale }: { locale: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-red-900/20 border border-red-700/50 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-200 mb-2">
          Kunne ikke laste systemhelse
        </h2>
        <p className="text-red-300/80 mb-4">
          Det oppstod en feil ved lasting av systemdata. Vennligst prøv igjen.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href={`/${locale}/admin-dashboard/system-health`}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Last inn på nytt
          </Link>
          <Link
            href={`/${locale}/admin-dashboard`}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Tilbake til admin
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function SystemHealthPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  try {
    const t = await getTranslations("admin.systemHealth");
    const supabase = await createClient();

    // Sjekk autentisering
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/${locale}/auth/login`);
    }

    // Sjekk admin-rollen
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      redirect(`/${locale}/dashboard`);
    }

    // Hent initial data (Server Component)
    const { data: cronJobs } = await supabase.rpc("get_cron_jobs_status");

    const { data: notificationStats } = await supabase
      .from("notification_queue")
      .select("status, count:count(*)")
      .group("status");

    const { data: rlsStatus } = await supabase.rpc("get_rls_status");

    const { data: topTables } = await supabase.rpc("get_top_tables_by_rows", {
      limit_count: 20,
    });

    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground mb-8">{t("description")}</p>

        <SystemHealthClient
          initialCronJobs={cronJobs || []}
          initialNotificationStats={notificationStats || []}
          initialRlsStatus={rlsStatus || { total: 0, enabled: 0, tables: [] }}
          initialTopTables={topTables || []}
          locale={locale}
        />
      </div>
    );
  } catch (error) {
    console.error('System health page error:', error);
    // Return fallback UI istedenfor å krasje
    return <SystemHealthErrorFallback locale={locale} />;
  }
}
