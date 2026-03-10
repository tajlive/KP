import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SystemHealthClient } from "./SystemHealthClient";

export default async function SystemHealthPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
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
}
