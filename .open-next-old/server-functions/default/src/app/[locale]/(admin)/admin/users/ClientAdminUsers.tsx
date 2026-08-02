"use client";

import { createClient } from "@/lib/utils";
import { TABLE } from "@/lib/design/tokens";
import {
  ArrowUpCircle,
  Award,
  Camera,
  CheckCircle,
  Crown,
  Eye,
  GraduationCap,
  RefreshCw,
  Search,
  Shield,
  Star,
  User,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { type UserData, roles, tiers, sources } from "./admin-users.types";



export default function ClientAdminUsers() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [paperUser, setPaperUser] = useState<UserData | null>(null);
  const [paperAmount, setPaperAmount] = useState("");
  const [paperSyncSessions, setPaperSyncSessions] = useState(true);
  const [paperResetBaseline, setPaperResetBaseline] = useState(false);
  const [savingPaper, setSavingPaper] = useState(false);
  const [reportUser, setReportUser] = useState<UserData | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportJobId, setReportJobId] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<
    "queued" | "running" | "done" | "failed"
  >("queued");
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [reportExpiresAt, setReportExpiresAt] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const reportTimeoutRef = useRef<number | null>(null);

  const clearReportTimeout = () => {
    if (reportTimeoutRef.current) {
      clearTimeout(reportTimeoutRef.current);
      reportTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearReportTimeout();
    };
  }, []);

  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      const rows = (data || []) as Record<string, unknown>[];
      setUsers(
        rows.map((row) => {
          const tierRaw =
            (row.subscription_tier as string) ||
            (row.tier as string) ||
            "student";
          return {
            ...(row as unknown as UserData),
            subscription_tier: tierRaw,
            paper_balance: Number(row.paper_balance ?? 0),
          };
        }),
      );
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Kunne ikke hente brukere");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.user_number?.toString().includes(searchQuery);

    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesTier =
      tierFilter === "all" || user.subscription_tier === tierFilter;
    const matchesSource =
      sourceFilter === "all" || user.source === sourceFilter;

    return matchesSearch && matchesRole && matchesTier && matchesSource;
  });

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc("admin_change_role", {
        p_user_id: userId,
        p_new_role: newRole,
        p_admin_id: user?.id || "",
      });

      if (error) throw error;

      const result = data as { success?: boolean; error?: string } | null;
      if (result?.success) {
        toast.success(`Rolle endret til ${newRole}`);
        fetchUsers();
      } else {
        toast.error(result?.error || "Kunne ikke endre rolle");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Kunne ikke endre rolle");
    }
  };

  const handleUpgrade = async (newTier: string) => {
    if (!selectedUser) return;

    setUpgrading(true);
    try {
      const res = await fetch("/api/admin/user-tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          tier: newTier,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof body.error === "string"
            ? body.error
            : t("usersPage.tierError"),
        );
        return;
      }
      toast.success(t("usersPage.tierUpdated"));
      setShowUpgradeModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      console.error("Error upgrading user:", error);
      toast.error(t("usersPage.tierError"));
    } finally {
      setUpgrading(false);
    }
  };

  const savePaperBalance = async () => {
    if (!paperUser) return;
    const n = Number(paperAmount.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Ugyldig beløp");
      return;
    }
    setSavingPaper(true);
    try {
      const res = await fetch("/api/admin/user-paper-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: paperUser.id,
          balance_nok: n,
          sync_trading_sessions: paperSyncSessions,
          reset_session_baseline: paperResetBaseline,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof body.error === "string"
            ? body.error
            : t("usersPage.paperError"),
        );
        return;
      }
      toast.success(t("usersPage.paperSaved"));
      setShowPaperModal(false);
      setPaperUser(null);
      await fetchUsers();
    } catch (e) {
      console.error(e);
      toast.error(t("usersPage.paperError"));
    } finally {
      setSavingPaper(false);
    }
  };

  const handleCockpitReport = async (user: UserData) => {
    setReportUser(user);
    setReportJobId(null);
    setReportStatus("queued");
    setReportUrl(null);
    setReportExpiresAt(null);
    setReportLoading(true);
    setShowReportModal(true);

    try {
      const res = await fetch("/api/admin/support/cockpit-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const body = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!res.ok) {
        toast.error(
          typeof body.error === "string"
            ? body.error
            : t("usersPage.reportError"),
        );
        setReportStatus("failed");
        return;
      }
      const jobId = body.jobId;
      if (!jobId || typeof jobId !== "string") {
        toast.error(t("usersPage.reportError"));
        setReportStatus("failed");
        return;
      }
      setReportJobId(jobId);
      setReportStatus(
        body.status === "done" ? "done" : ("queued" as const),
      );
      if (body.status === "done") {
        setReportUrl((body.url as string | undefined) ?? null);
        setReportExpiresAt((body.expiresAt as string | undefined) ?? null);
        toast.success(t("usersPage.reportReady"));
      } else {
        void pollReportStatus(jobId);
      }
    } catch (error) {
      console.error("Error queuing cockpit report:", error);
      toast.error(t("usersPage.reportError"));
      setReportStatus("failed");
    } finally {
      setReportLoading(false);
    }
  };

  const pollReportStatus = async (jobId: string) => {
    const check = async () => {
      try {
        const res = await fetch(
          `/api/admin/support/cockpit-report/status?jobId=${encodeURIComponent(jobId)}`,
        );
        const body = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        if (!res.ok) {
          setReportStatus("failed");
          toast.error(
            typeof body.error === "string"
              ? body.error
              : t("usersPage.reportError"),
          );
          return;
        }
        const status = body.status as
          | "queued"
          | "running"
          | "done"
          | "failed";
        setReportStatus(status);
        if (status === "done") {
          setReportUrl((body.url as string | undefined) ?? null);
          setReportExpiresAt((body.expiresAt as string | undefined) ?? null);
          toast.success(t("usersPage.reportReady"));
          return;
        }
        if (status === "failed") {
          toast.error(t("usersPage.reportFailed"));
          return;
        }
        reportTimeoutRef.current = window.setTimeout(check, 5000);
      } catch (error) {
        console.error("Error polling cockpit report status:", error);
        setReportStatus("failed");
      }
    };
    void check();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Aldri";
    return new Date(dateString).toLocaleDateString("no-NO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const _getRoleBadge = (role: string) => {
    const roleConfig = roles.find((r) => r.id === role) || roles[0];
    const Icon = roleConfig.icon;
    const roleLabel = roles.some((r) => r.id === role)
      ? t(`usersPage.roles.${role}`)
      : role;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${roleConfig.color} bg-opacity-20 text-white`}
      >
        <Icon className="w-3 h-3" />
        {roleLabel}
      </span>
    );
  };

  const getTierBadge = (tier: string) => {
    const tierConfig = tiers.find((x) => x.id === tier) || tiers[0];
    const tierLabel = tiers.some((x) => x.id === tier)
      ? t(`usersPage.tiers.${tier}`)
      : tier;
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${tierConfig.color} bg-opacity-20 text-white`}
      >
        {tierLabel}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Brukere</h1>
          <p className="text-slate-400">
            Administrer brukere, roller og abonnement
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Oppdater
          </button>
          <button
            type="button"
            onClick={async () => {
              setSyncing(true);
              try {
                const res = await fetch("/api/admin/users/sync", {
                  method: "POST",
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  toast.error(data.error || "Synk feilet");
                  return;
                }
                toast.success(
                  data.message ?? `Synkronisert ${data.synced ?? 0} brukere`,
                );
                await fetchUsers();
              } catch (e) {
                toast.error("Kunne ikke synkronisere brukere");
              } finally {
                setSyncing(false);
              }
            }}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-[#0052FF]/20 text-[#0052FF] border border-[#0052FF]/50 rounded-lg hover:bg-[#0052FF]/30 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Synker…" : "Synk brukere fra Auth"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Totalt brukere</p>
          <p className="text-2xl font-bold text-white">{users.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Beta-brukere</p>
          <p className="text-2xl font-bold text-amber-400">
            {users.filter((u) => u.role === "beta").length}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Premium+</p>
          <p className="text-2xl font-bold text-emerald-400">
            {
              users.filter((u) =>
                ["premium", "master", "phd", "professor"].includes(u.role),
              ).length
            }
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Nye denne uken</p>
          <p className="text-2xl font-bold text-emerald-400">
            {
              users.filter((u) => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return u.created_at && new Date(u.created_at) > weekAgo;
              }).length
            }
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={t("searchUsers")}
            aria-label={t("searchUsers")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#0052FF]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label={t("usersPage.ariaFilterRole")}
          className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#0052FF]"
        >
          <option value="all">{t("usersPage.filterAllRoles")}</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {t(`usersPage.roles.${r.id}`)}
            </option>
          ))}
        </select>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          aria-label={t("usersPage.ariaFilterTier")}
          className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#0052FF]"
        >
          <option value="all">{t("usersPage.filterAllTiers")}</option>
          {tiers.map((tier) => (
            <option key={tier.id} value={tier.id}>
              {t(`usersPage.tiers.${tier.id}`)}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          aria-label={t("usersPage.ariaFilterSource")}
          className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#0052FF]"
        >
          <option value="all">{t("usersPage.filterAllSources")}</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {t(`usersPage.sources.${s.id}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className={TABLE.header}>
                  <input
                    type="checkbox"
                    aria-label={t("usersPage.ariaSelectAllUsers")}
                    className="rounded border-slate-600 bg-slate-800"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(filteredUsers.map((u) => u.id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                  />
                </th>
                <th className={TABLE.header}>#</th>
                <th className={TABLE.header}>Bruker</th>
                <th className={TABLE.header}>Rolle</th>
                <th className={TABLE.header}>Nivå</th>
                <th className={TABLE.header}>{t("usersPage.paperBalance")}</th>
                <th className={TABLE.header}>Kilde</th>
                <th className={TABLE.header}>Registrert</th>
                <th className={TABLE.header}>Handlinger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={TABLE.row}>
                  <td className={TABLE.cell}>
                    <input
                      type="checkbox"
                      aria-label={`Velg ${user.email || user.id}`}
                      className="rounded border-slate-600 bg-slate-800"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(
                            selectedUsers.filter((id) => id !== user.id),
                          );
                        }
                      }}
                    />
                  </td>
                  <td className={TABLE.cellNumeric}>
                    <span className="text-slate-500 font-mono text-sm tabular-nums">
                      KP-{user.user_number}
                    </span>
                  </td>
                  <td className={TABLE.cell}>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {user.username || "Ukjent"}
                        {user.beta_approved && (
                          <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                            BETA
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                      {user.full_name && (
                        <p className="text-xs text-slate-600">
                          {user.full_name}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className={TABLE.cell}>
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleRoleChange(user.id, e.target.value)
                      }
                      aria-label={`Rolle: ${user.email || user.id}`}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {t(`usersPage.roles.${r.id}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    {getTierBadge(user.subscription_tier)}
                  </td>
                  <td className={TABLE.cell}>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-white tabular-nums">
                        {new Intl.NumberFormat("no-NO", {
                          maximumFractionDigits: 0,
                        }).format(user.paper_balance ?? 0)}{" "}
                        kr
                      </span>
                      <button
                        type="button"
                        aria-label={`${t("usersPage.setPaper")}: ${user.email || user.id}`}
                        onClick={() => {
                          setPaperUser(user);
                          setPaperAmount(
                            String(Math.round(user.paper_balance ?? 100_000)),
                          );
                          setPaperSyncSessions(true);
                          setPaperResetBaseline(false);
                          setShowPaperModal(true);
                        }}
                        className="flex items-center gap-1 text-xs text-[#6FA3FF] hover:text-[#0052FF] font-medium"
                      >
                        <Wallet className="w-3 h-3" />
                        {t("usersPage.setPaper")}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-slate-400 capitalize">
                      {user.source && sources.some((s) => s.id === user.source)
                        ? t(`usersPage.sources.${user.source}`)
                        : user.source}
                    </span>
                  </td>
                  <td className={TABLE.cellNumeric}>
                    <span className="text-slate-400 tabular-nums">
                      {formatDate(user.created_at)}
                    </span>
                  </td>
                  <td className={TABLE.cell}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUpgradeModal(true);
                        }}
                        aria-label={`Oppgrader: ${user.email || user.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#0052FF]/20 text-[#6FA3FF] rounded-lg hover:bg-[#0052FF]/30 transition-colors text-xs font-medium"
                      >
                        <ArrowUpCircle className="w-3 h-3" />
                        Oppgrader
                      </button>
                      <button
                        onClick={() => void handleCockpitReport(user)}
                        disabled={reportLoading && reportUser?.id === user.id}
                        aria-label={`${t("usersPage.cockpitReport")}: ${user.email || user.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors text-xs font-medium disabled:opacity-50"
                      >
                        <Camera className="w-3 h-3" />
                        {t("usersPage.cockpitReport")}
                      </button>
                      <a
                        href={`/${locale}/admin/support/impersonate?email=${encodeURIComponent(user.email || "")}`}
                        aria-label={`${t("usersPage.impersonate")}: ${user.email || user.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors text-xs font-medium"
                      >
                        <Eye className="w-3 h-3" />
                        {t("usersPage.impersonate")}
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500">Ingen brukere funnet</p>
          </div>
        )}
      </div>

      {/* Lekepenger modal */}
      {showPaperModal && paperUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-semibold text-white">
              {t("usersPage.paperModalTitle")}
            </h3>
            <p className="text-sm text-slate-400">
              {t("usersPage.paperModalHint")}
            </p>
            <p className="text-sm text-slate-300">
              {paperUser.email || paperUser.id}
            </p>
            <div className="block">
              <label
                htmlFor="admin-paper-balance-input"
                className="text-xs text-slate-500 uppercase tracking-wide"
              >
                {t("usersPage.balanceKr")}
              </label>
              <input
                id="admin-paper-balance-input"
                type="text"
                inputMode="decimal"
                value={paperAmount}
                onChange={(e) => setPaperAmount(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                aria-label={t("usersPage.balanceKr")}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={paperSyncSessions}
                onChange={(e) => setPaperSyncSessions(e.target.checked)}
                className="rounded border-slate-600"
              />
              {t("usersPage.syncSessions")}
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={paperResetBaseline}
                onChange={(e) => setPaperResetBaseline(e.target.checked)}
                className="rounded border-slate-600"
              />
              {t("usersPage.resetBaseline")}
            </label>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPaperModal(false);
                  setPaperUser(null);
                }}
                className="px-4 py-2 text-slate-400 hover:text-white"
                disabled={savingPaper}
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() => void savePaperBalance()}
                disabled={savingPaper}
                className="px-4 py-2 bg-[#0052FF] text-white rounded-lg font-medium disabled:opacity-50"
              >
                {savingPaper ? "…" : t("usersPage.savePaper")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">
              Oppgrader bruker
            </h3>
            <p className="text-slate-400 mb-6">
              {t("selectTier")}{" "}
              <strong className="text-white">
                {selectedUser.username || selectedUser.email}
              </strong>
            </p>

            <div className="space-y-2 mb-6">
              {tiers.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => handleUpgrade(tier.id)}
                  disabled={
                    upgrading || selectedUser.subscription_tier === tier.id
                  }
                  className={`w-full flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    selectedUser.subscription_tier === tier.id
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${tier.color}`} />
                    <span className="text-white font-medium">
                      {t(`usersPage.tiers.${tier.id}`)}
                    </span>
                  </div>
                  {selectedUser.subscription_tier === tier.id && (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                disabled={upgrading}
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cockpit Report Modal */}
      {showReportModal && reportUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-semibold text-white">
              {t("usersPage.reportModalTitle")}
            </h3>
            <p className="text-sm text-slate-400">
              {t("usersPage.reportModalHint")}
            </p>
            <p className="text-sm text-slate-300">
              {reportUser.username || reportUser.email}
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{t("usersPage.reportStatus")}</span>
                <span className="text-white capitalize">
                  {reportStatus === "queued" && t("usersPage.reportPending")}
                  {reportStatus === "running" && t("usersPage.reportRunning")}
                  {reportStatus === "done" && t("usersPage.reportDone")}
                  {reportStatus === "failed" && t("usersPage.reportFailed")}
                </span>
              </div>
              {reportLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {t("usersPage.reportQueueing")}
                </div>
              )}
              {reportJobId && (
                <div className="text-xs text-slate-500 font-mono break-all">
                  {t("usersPage.reportJobId")}: {reportJobId}
                </div>
              )}
              {reportUrl && (
                <a
                  href={reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-[#6FA3FF] hover:text-[#0052FF] underline break-all"
                >
                  {t("usersPage.reportDownload")}
                </a>
              )}
              {reportExpiresAt && (
                <p className="text-xs text-slate-500">
                  {t("usersPage.reportExpires")}: {formatDate(reportExpiresAt)}
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  clearReportTimeout();
                  setShowReportModal(false);
                  setReportUser(null);
                  setReportJobId(null);
                  setReportStatus("queued");
                  setReportUrl(null);
                  setReportExpiresAt(null);
                }}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                {t("usersPage.reportClose")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
