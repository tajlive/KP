"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface CronJob {
  jobname: string;
  schedule: string;
  active: boolean;
  siste_kjøring: string | null;
  siste_status: string | null;
}

interface NotificationStat {
  status: string;
  count: number;
}

interface RlsTable {
  tablename: string;
  rowsecurity: boolean;
}

interface RlsStatus {
  total: number;
  enabled: number;
  tables: RlsTable[];
}

interface TopTable {
  tablename: string;
  rader: number;
}

interface SystemCheck {
  name: string;
  status: "ok" | "error" | "loading";
  message: string;
  latencyMs: number;
}

interface SystemHealthClientProps {
  initialCronJobs: CronJob[];
  initialNotificationStats: NotificationStat[];
  initialRlsStatus: RlsStatus;
  initialTopTables: TopTable[];
  locale: string;
}

export function SystemHealthClient({
  initialCronJobs,
  initialNotificationStats,
  initialRlsStatus,
  initialTopTables,
  locale,
}: SystemHealthClientProps) {
  const t = useTranslations("admin.systemHealth");
  const supabase = createClient();

  const [cronJobs, setCronJobs] = useState<CronJob[]>(initialCronJobs);
  const [notificationStats, setNotificationStats] = useState<NotificationStat[]>(
    initialNotificationStats
  );
  const [rlsStatus, setRlsStatus] = useState<RlsStatus>(initialRlsStatus);
  const [topTables, setTopTables] = useState<TopTable[]>(initialTopTables);
  const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([
    { name: "github", status: "loading", message: "", latencyMs: 0 },
    { name: "stripe", status: "loading", message: "", latencyMs: 0 },
    { name: "supabase", status: "loading", message: "", latencyMs: 0 },
    { name: "resend", status: "loading", message: "", latencyMs: 0 },
    { name: "keepalive", status: "loading", message: "", latencyMs: 0 },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Hent system-sjekker
  const fetchSystemChecks = async () => {
    const checks = ["github", "stripe", "supabase", "resend"];
    const results: SystemCheck[] = [];

    for (const check of checks) {
      const start = performance.now();
      try {
        const response = await fetch(`/api/admin/${check}-health`);
        const data = await response.json();
        results.push({
          name: check,
          status: data.status,
          message: data.message,
          latencyMs: Math.round(performance.now() - start),
        });
      } catch {
        results.push({
          name: check,
          status: "error",
          message: t("errors.connectionFailed"),
          latencyMs: Math.round(performance.now() - start),
        });
      }
    }

    // Sjekk keepalive separat (annen endpoint)
    const keepaliveStart = performance.now();
    try {
      const response = await fetch("/api/cron/keepalive");
      const data = await response.json();
      results.push({
        name: "keepalive",
        status: data.ok ? "ok" : "error",
        message: data.ok ? "Active" : data.error,
        latencyMs: Math.round(performance.now() - keepaliveStart),
      });
    } catch {
      results.push({
        name: "keepalive",
        status: "error",
        message: t("errors.connectionFailed"),
        latencyMs: Math.round(performance.now() - keepaliveStart),
      });
    }

    setSystemChecks(results);
  };

  // Hent all data
  const refreshData = async () => {
    try {
      // Cron jobs
      const { data: cronData } = await supabase.rpc("get_cron_jobs_status");
      if (cronData) setCronJobs(cronData);

      // Notification stats
      const { data: notifData } = await supabase
        .from("notification_queue")
        .select("status, count:count(*)")
        .group("status");
      if (notifData) setNotificationStats(notifData);

      // RLS status
      const { data: rlsData } = await supabase.rpc("get_rls_status");
      if (rlsData) setRlsStatus(rlsData);

      // Top tables
      const { data: topData } = await supabase.rpc("get_top_tables_by_rows", {
        limit_count: 20,
      });
      if (topData) setTopTables(topData);

      // System checks
      await fetchSystemChecks();

      setLastRefresh(new Date());
    } catch (error) {
      toast.error(t("errors.refreshFailed"));
    }
  };

  // Prosesser notification queue
  const processQueue = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc(
        "process_pending_notifications",
        { batch_size: 10 }
      );

      if (error) throw error;

      toast.success(
        t("notifications.processed", {
          processed: data?.[0]?.processed || 0,
          failed: data?.[0]?.failed || 0,
        })
      );

      // Oppdater stats
      await refreshData();
    } catch {
      toast.error(t("errors.processFailed"));
    } finally {
      setIsProcessing(false);
    }
  };

  // Polling hvert 30. sekund
  useEffect(() => {
    const interval = setInterval(refreshData, 30000);
    fetchSystemChecks(); // Initial fetch
    return () => clearInterval(interval);
  }, []);

  const getNotificationCount = (status: string) => {
    return notificationStats.find((s) => s.status === status)?.count || 0;
  };

  const formatDate = (date: string | null) => {
    if (!date) return t("never");
    return new Date(date).toLocaleString(locale);
  };

  return (
    <div className="space-y-6">
      {/* Seksjon 1 — Cron Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t("cronJobs.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">{t("cronJobs.name")}</th>
                  <th className="text-left py-2">{t("cronJobs.schedule")}</th>
                  <th className="text-left py-2">{t("cronJobs.status")}</th>
                  <th className="text-left py-2">{t("cronJobs.lastRun")}</th>
                  <th className="text-left py-2">{t("cronJobs.lastStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {cronJobs.map((job) => (
                  <tr key={job.jobname} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{job.jobname}</td>
                    <td className="py-2 font-mono text-xs">{job.schedule}</td>
                    <td className="py-2">
                      <Badge
                        variant={job.active ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {job.active ? t("active") : t("inactive")}
                      </Badge>
                    </td>
                    <td className="py-2 text-muted-foreground text-xs">
                      {formatDate(job.siste_kjøring)}
                    </td>
                    <td className="py-2">
                      {job.siste_status && (
                        <Badge
                          variant={
                            job.siste_status === "succeeded"
                              ? "default"
                              : "destructive"
                          }
                          className="text-xs"
                        >
                          {job.siste_status}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Seksjon 2 — Notification Queue */}
      <Card>
        <CardHeader>
          <CardTitle>{t("notifications.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="bg-yellow-50 dark:bg-yellow-950">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {getNotificationCount("pending")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("notifications.pending")}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-950">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {getNotificationCount("sent")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("notifications.sent")}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-950">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-red-600">
                  {getNotificationCount("failed")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("notifications.failed")}
                </div>
              </CardContent>
            </Card>
          </div>
          <Button
            onClick={processQueue}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {t("notifications.processButton")}
          </Button>
        </CardContent>
      </Card>

      {/* Seksjon 3 — RLS Status */}
      <Card>
        <CardHeader>
          <CardTitle>{t("rls.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <span className="text-2xl font-bold">
              {rlsStatus.enabled}/{rlsStatus.total}
            </span>{" "}
            <span className="text-muted-foreground">
              {t("rls.tablesWithRls")}
            </span>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {rlsStatus.tables.map((table) => (
              <div
                key={table.tablename}
                className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted"
              >
                <span className="font-mono text-sm">{table.tablename}</span>
                <Badge
                  variant={table.rowsecurity ? "default" : "destructive"}
                  className="text-xs"
                >
                  {table.rowsecurity ? "RLS" : "NO RLS"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seksjon 4 — DB Oversikt */}
      <Card>
        <CardHeader>
          <CardTitle>{t("db.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topTables.map((table) => (
              <div key={table.tablename} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-mono">{table.tablename}</span>
                  <span className="text-muted-foreground">
                    {table.rader.toLocaleString()} {t("db.rows")}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: `${Math.min(
                        (table.rader / (topTables[0]?.rader || 1)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seksjon 5 — System Sjekkliste */}
      <Card>
        <CardHeader>
          <CardTitle>{t("systemChecks.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {systemChecks.map((check) => (
              <div
                key={check.name}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  {check.status === "ok" ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : check.status === "error" ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                  )}
                  <div>
                    <div className="font-medium capitalize">
                      {t(`systemChecks.${check.name}`)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {check.message || t("loading")}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {check.latencyMs > 0 && `${check.latencyMs}ms`}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            {t("lastRefresh")}: {lastRefresh.toLocaleString(locale)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
