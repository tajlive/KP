"use client";

import { banUser, grantFounderStatus } from "@/actions/admin/users"; // Import Server Actions
import { createClient } from "@/lib/utils"; // Use client-side client for fetching
import { AlertTriangle, Ban, Crown, Search, Shield } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/error";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  subscription_tier: string;
  created_at: string;
  last_sign_in_at: string | null;
  beta_approved: boolean;
  status: string;
}

export default function ClientStudentsPage() {
  const t = useTranslations("admin");
  const _locale = useLocale();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [_selectedUsers, _setSelectedUsers] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "suspend" | "role" | "founder" | "ban";
    userId: string;
    newRole?: string;
  } | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers((data as unknown as User[]) || []);
    } catch (err) {
      console.error("Error fetching users:", getErrorMessage(err));
      toast.error(t("loadUsersError"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // --- Actions Handlers ---

  const handleGrantFounder = async (userId: string) => {
    setConfirmAction({ type: "founder", userId });
    setShowConfirmModal(true);
  };

  const confirmGrantFounder = async () => {
    if (!confirmAction) return;

    try {
      const result = await grantFounderStatus(confirmAction.userId);
      if (result.success) {
        toast.success(result.message);
        fetchUsers(); // Refresh list
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error("Grant founder error:", getErrorMessage(err));
      toast.error(t("grantFounderError"));
    } finally {
      setShowConfirmModal(false);
      setConfirmAction(null);
    }
  };

  const handleBan = async (userId: string) => {
    setConfirmAction({ type: "ban", userId });
    setShowConfirmModal(true);
  };

  const confirmBan = async () => {
    if (!confirmAction) return;

    try {
      // Default reason for now, could be an input in modal
      const result = await banUser(confirmAction.userId, "Banned by Admin");
      if (result.success) {
        toast.success(result.message);
        fetchUsers();
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error("Ban user error:", getErrorMessage(err));
      toast.error(t("banUserError"));
    } finally {
      setShowConfirmModal(false);
      setConfirmAction(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setConfirmAction({ type: "role", userId, newRole });
    setShowConfirmModal(true);
  };

  const confirmRoleChange = async () => {
    if (!confirmAction) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("user_profiles")
        .update({ role: confirmAction.newRole })
        .eq("id", confirmAction.userId);

      if (error) throw error;

      toast.success(t("roleUpdated"));
      await fetchUsers();
    } catch (err) {
      console.error("Error updating role:", getErrorMessage(err));
      toast.error(t("updateRoleError"));
    } finally {
      setShowConfirmModal(false);
      setConfirmAction(null);
    }
  };

  // --- UI Helpers ---

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Aldri";
    return new Date(dateString).toLocaleDateString("no-NO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const roleColors: { [key: string]: string } = {
    admin: "bg-emerald-500/20 text-emerald-400",
    analyst: "bg-blue-500/20 text-blue-400",
    trader: "bg-emerald-500/20 text-emerald-400",
    student: "bg-slate-500/20 text-slate-400",
    founder: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{t("students")}</h1>
          <p className="text-slate-400">{t("manageUsers")}</p>
        </div>
        <div className="flex gap-3">
          <button
            disabled
            title="Inviter bruker — kommer snart"
            className="px-4 py-2 bg-blue-600/50 text-white/70 rounded-lg text-sm font-medium cursor-not-allowed"
          >
            + Inviter bruker
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={t("search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t("search") || "Søk brukere"}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label={t("usersPage.students.ariaFilterRole")}
          className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">{t("usersPage.students.filterAllRoles")}</option>
          <option value="admin">{t("usersPage.roles.admin")}</option>
          <option value="founder">{t("usersPage.roles.founder")}</option>
          <option value="analyst">{t("usersPage.roles.analyst")}</option>
          <option value="trader">{t("usersPage.roles.trader")}</option>
          <option value="student">{t("usersPage.roles.student")}</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">
                  Bruker
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">
                  Rolle
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">
                  Registrert
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">
                  Handlinger
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/50">
                  {/* eslint-disable-next-line jsx-a11y/control-has-associated-label -- cell is display-only (name/email) */}
                  <td className="px-6 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">
                          {user.full_name || t("unknownName")}
                        </p>
                        {user.role === "founder" && (
                          <Crown className="w-3 h-3 text-amber-500" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{user.email}</p>
                      <p className="text-xs text-slate-600 font-mono mt-1">
                        {user.id.slice(0, 8)}...
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border border-transparent ${roleColors[user.role] || roleColors.student}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs capitalize ${
                        user.status === "banned"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {user.status || t("active")}
                    </span>
                    {user.beta_approved && (
                      <span className="ml-2 px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">
                        Beta
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {user.role !== "founder" && (
                        <button
                          type="button"
                          onClick={() => handleGrantFounder(user.id)}
                          aria-label="Gi Founder Status (+10k KLT)"
                          className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
                          title="Gi Founder Status (+10k KLT)"
                        >
                          <Crown className="w-4 h-4" />
                        </button>
                      )}

                      {user.status !== "banned" ? (
                        <button
                          type="button"
                          onClick={() => handleBan(user.id)}
                          aria-label="Bann bruker"
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Ban Bruker"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="p-2 text-red-500 text-xs">{t("banned")}</span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRoleChange(user.id, "admin")}
                        aria-label={t("changeToAdmin")}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        title={t("changeToAdmin")}
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-semibold text-white">
                {confirmAction.type === "founder" && t("confirmFounder")}
                {confirmAction.type === "ban" && t("confirmBan")}
                {confirmAction.type === "role" && t("confirmRoleChange")}
              </h3>
            </div>

            <p className="text-slate-400 mb-6">
              {confirmAction.type === "founder" && t("founderConfirmDesc")}
              {confirmAction.type === "ban" && t("banConfirmDesc")}
              {confirmAction.type === "role" && confirmAction.newRole && t("roleConfirmDesc", { role: confirmAction.newRole })}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === "founder") confirmGrantFounder();
                  else if (confirmAction.type === "ban") confirmBan();
                  else if (confirmAction.type === "role") confirmRoleChange();
                }}
                className={`px-4 py-2 rounded-lg font-medium ${
                  confirmAction.type === "ban"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                Bekreft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
