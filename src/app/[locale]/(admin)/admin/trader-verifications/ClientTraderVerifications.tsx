"use client";

import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type VerificationStatus = "pending" | "approved" | "rejected";

type TraderProfile = {
  id: string;
  user_id: string;
  display_name: string | null;
  verified: boolean;
};

interface TraderVerification {
  id: string;
  trader_profile_id: string;
  status: VerificationStatus;
  created_at: string;
  reason: string | null;
  trader_profiles?: TraderProfile | TraderProfile[];
}

export default function ClientTraderVerifications() {
  const t = useTranslations("admin");
  const [verifications, setVerifications] = useState<TraderVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<VerificationStatus | "all">(
    "pending",
  );
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchVerifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam =
        filterStatus === "all" ? "" : `status=${filterStatus}`;
      const query = statusParam
        ? `?${statusParam}&limit=50&offset=0`
        : "?limit=50&offset=0";
      const res = await fetch(`/api/admin/trader-verifications${query}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setVerifications(data.verifications || data.items || data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Error fetching trader verifications:", err);
      setError(message);
      toast.error(
        t("traderVerifications.fetchError") ||
          "Kunne ikke hente verifikasjoner",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, [filterStatus]);

  const handleAction = async (
    trader_profile_id: string,
    status: "approved" | "rejected",
  ) => {
    let reason =
      status === "approved" ? "Approved by admin" : "Rejected by admin";
    if (status === "rejected") {
      const promptReason = window.prompt(
        t("traderVerifications.rejectPrompt") || "Årsak til avvisning",
      );
      if (promptReason === null) return;
      if (promptReason.trim()) reason = promptReason.trim();
    }

    setProcessingId(trader_profile_id);
    try {
      const res = await fetch("/api/admin/trader-verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ trader_profile_id, status, reason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      toast.success(
        status === "approved"
          ? t("traderVerifications.approvedSuccess") || "Godkjent"
          : t("traderVerifications.rejectedSuccess") || "Avvist",
      );
      await fetchVerifications();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Error updating trader verification:", err);
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (value: string) => {
    try {
      return new Date(value).toLocaleString("no-NB");
    } catch {
      return value;
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    const base = "px-2 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case "approved":
        return `${base} bg-emerald-500/20 text-emerald-400`;
      case "rejected":
        return `${base} bg-red-500/20 text-red-400`;
      default:
        return `${base} bg-amber-500/20 text-amber-400`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {t("nav.traderVerifications")}
          </h1>
          <p className="text-slate-400 text-sm">
            {t("traderVerifications.subtitle") ||
              "Godkjenn eller avvis trader-forespørsler"}
          </p>
        </div>
        <select
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value as VerificationStatus | "all")
          }
          className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#0052FF]"
        >
          <option value="pending">
            {t("traderVerifications.status.pending") || "Venter"}
          </option>
          <option value="approved">
            {t("traderVerifications.status.approved") || "Godkjent"}
          </option>
          <option value="rejected">
            {t("traderVerifications.status.rejected") || "Avvist"}
          </option>
          <option value="all">
            {t("traderVerifications.status.all") || "Alle"}
          </option>
        </select>
      </div>

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <Skeleton variant="heading" className="w-1/3" />
          <Skeleton variant="text" className="w-full" />
          <Skeleton variant="text" className="w-full" />
          <Skeleton variant="text" className="w-full" />
        </div>
      ) : error ? (
        <div className="bg-slate-900 border border-red-900/50 rounded-xl p-6">
          <p className="text-red-400">{error}</p>
          <Button
            variant="secondary"
            onClick={fetchVerifications}
            className="mt-4"
          >
            {t("traderVerifications.retry") || "Prøv igjen"}
          </Button>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {t("traderVerifications.trader") || "Trader"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {t("traderVerifications.statusColumn") || "Status"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {t("traderVerifications.date") || "Dato"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {t("traderVerifications.reason") || "Grunn"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {t("traderVerifications.actions") || "Handlinger"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {verifications.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      {t("traderVerifications.empty") ||
                        "Ingen verifikasjoner funnet"}
                    </td>
                  </tr>
                ) : (
                  verifications.map((v) => {
                    const profile = Array.isArray(v.trader_profiles)
                      ? v.trader_profiles[0]
                      : v.trader_profiles;
                    const traderName =
                      profile?.display_name || v.trader_profile_id;
                    return (
                      <tr key={v.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors duration-150">
                        <td className="px-4 py-3 text-sm">
                          <span className="text-sm font-medium text-white">
                            {traderName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={getStatusBadge(v.status)}>
                            {v.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="text-sm text-slate-400">
                            {formatDate(v.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="text-sm text-slate-400 max-w-xs truncate block">
                            {v.reason || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="positive"
                              size="sm"
                              disabled={
                                processingId === v.trader_profile_id ||
                                v.status !== "pending"
                              }
                              onClick={() =>
                                handleAction(v.trader_profile_id, "approved")
                              }
                              aria-label={
                                t("traderVerifications.approve") || "Godkjenn"
                              }
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="negative"
                              size="sm"
                              disabled={
                                processingId === v.trader_profile_id ||
                                v.status !== "pending"
                              }
                              onClick={() =>
                                handleAction(v.trader_profile_id, "rejected")
                              }
                              aria-label={
                                t("traderVerifications.reject") || "Avvis"
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
