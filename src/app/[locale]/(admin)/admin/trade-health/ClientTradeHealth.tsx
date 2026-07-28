"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Coins,
  Database,
  RefreshCw,
  Scale,
  Users,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface HealthData {
  ok: boolean;
  timestamp: string;
  priceSource: string;
  health: "clean" | "issues";
  issues: string[];
  stats: {
    tradesTotal: number;
    mockRows: number;
    usdtRows: number;
    mixedRows: number;
    ambiguousRows: number;
    sessionsTotal: number;
    activeSessions: number;
    usersOverSessionLimit: number;
    maxSessionsPerUser: number;
    balanceDriftUsers: number;
    usersWithTrades: number;
  };
  perPair30d: { pair: string; closed: number; winRate: number | null; pnl: number }[];
}

interface FixResult {
  ok: boolean;
  fixes: Record<string, number | string>;
  warnings: string[];
}

function StatCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  tone: "ok" | "warn" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const color =
    tone === "ok" ? "text-emerald-400" : tone === "warn" ? "text-amber-400" : "text-slate-200";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

export default function ClientTradeHealth() {
  const t = useTranslations("admin.tradeHealth");
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(false);
  const [lastFix, setLastFix] = useState<FixResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/trade-health", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      toast.error(t("loadError"));
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const runFix = async () => {
    setFixing(true);
    setLastFix(null);
    try {
      const res = await fetch("/api/admin/trade-health/fix", { method: "POST" });
      const json = (await res.json()) as FixResult;
      setLastFix(json);
      if (res.ok && json.ok) {
        toast.success(t("fixSuccess"));
      } else {
        toast.warning?.(t("fixPartial")) ?? toast(t("fixPartial"));
      }
      await load();
    } catch (e) {
      toast.error(t("fixError"));
      console.error(e);
    } finally {
      setFixing(false);
    }
  };

  const s = data?.stats;
  const tone = (bad: number | undefined): "ok" | "warn" => (bad && bad > 0 ? "warn" : "ok");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100">{t("title")}</h1>
          <p className="text-sm text-slate-400">
            {data
              ? `${t("updated")}: ${new Date(data.timestamp).toLocaleString("no-NO")}`
              : t("loading")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-lg border border-slate-700 px-4 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
          <button
            onClick={() => void runFix()}
            disabled={fixing || loading}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            <Wrench className={`h-4 w-4 ${fixing ? "animate-pulse" : ""}`} />
            {fixing ? t("fixing") : t("runFix")}
          </button>
        </div>
      </div>

      {data && (
        <div
          className={`mb-6 flex items-center gap-3 rounded-xl border p-4 ${
            data.health === "clean"
              ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
              : "border-amber-800 bg-amber-950/40 text-amber-300"
          }`}
        >
          {data.health === "clean" ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : (
            <AlertTriangle className="h-6 w-6" />
          )}
          <div>
            <div className="font-semibold">
              {data.health === "clean" ? t("statusClean") : t("statusIssues")}
            </div>
            {data.issues.length > 0 && (
              <div className="text-xs opacity-80">{data.issues.join(" · ")}</div>
            )}
          </div>
        </div>
      )}

      {lastFix && (
        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm">
          <div className="mb-1 font-semibold text-slate-200">{t("lastFix")}</div>
          {Object.keys(lastFix.fixes).length === 0 ? (
            <div className="text-slate-400">{t("nothingToFix")}</div>
          ) : (
            <ul className="list-inside list-disc text-slate-300">
              {Object.entries(lastFix.fixes).map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
            </ul>
          )}
          {lastFix.warnings.length > 0 && (
            <div className="mt-2 text-amber-400">{lastFix.warnings.join(" | ")}</div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label={t("cards.mockRows")} value={s?.mockRows ?? "—"} tone={tone(s?.mockRows)} icon={Database} />
        <StatCard label={t("cards.usdtRows")} value={s?.usdtRows ?? "—"} tone={tone(s?.usdtRows)} icon={Coins} />
        <StatCard label={t("cards.mixedRows")} value={s?.mixedRows ?? "—"} tone={tone(s?.mixedRows)} icon={Coins} />
        <StatCard
          label={t("cards.sessionProliferation")}
          value={s?.usersOverSessionLimit ?? "—"}
          tone={tone(s?.usersOverSessionLimit)}
          icon={Users}
        />
        <StatCard label={t("cards.balanceDrift")} value={s?.balanceDriftUsers ?? "—"} tone={tone(s?.balanceDriftUsers)} icon={Scale} />
        <StatCard label={t("cards.ambiguous")} value={s?.ambiguousRows ?? "—"} tone="neutral" icon={AlertTriangle} />
        <StatCard label={t("cards.tradesTotal")} value={s?.tradesTotal ?? "—"} tone="neutral" icon={Activity} />
        <StatCard label={t("cards.activeSessions")} value={`${s?.activeSessions ?? "—"} / ${s?.sessionsTotal ?? "—"}`} tone="neutral" icon={Activity} />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-100">{t("pairTable.title")}</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">{t("pairTable.pair")}</th>
              <th className="px-4 py-3 text-right">{t("pairTable.closed")}</th>
              <th className="px-4 py-3 text-right">{t("pairTable.winRate")}</th>
              <th className="px-4 py-3 text-right">{t("pairTable.pnl")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {(data?.perPair30d ?? []).map((p) => (
              <tr key={p.pair} className="text-slate-300">
                <td className="px-4 py-3 font-medium">{p.pair}</td>
                <td className="px-4 py-3 text-right">{p.closed}</td>
                <td className="px-4 py-3 text-right">
                  {p.winRate != null ? `${p.winRate}%` : "—"}
                </td>
                <td
                  className={`px-4 py-3 text-right font-medium ${
                    p.pnl > 0 ? "text-emerald-400" : p.pnl < 0 ? "text-red-400" : ""
                  }`}
                >
                  {p.pnl.toLocaleString("no-NO", { maximumFractionDigits: 0 })} NOK
                </td>
              </tr>
            ))}
            {data && data.perPair30d.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  {t("pairTable.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-slate-500">{t("footerNote")}</p>
    </div>
  );
}
