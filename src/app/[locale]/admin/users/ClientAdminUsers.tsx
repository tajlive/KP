"use client";

import { createClient } from "@/lib/utils";
import { TABLE } from "@/lib/design/tokens";
import {
  ArrowUpCircle,
  Award,
  CheckCircle,
  Crown,
  GraduationCap,
  RefreshCw,
  Search,
  Shield,
  Star,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface UserData {
  id: string;
  user_number: number;
  username: string | null;
  email: string;
  full_name: string | null;
  role: string;
  subscription_tier: string;
  subscription_status: string;
  source: string;
  beta_approved: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  portfolio_value: number;
  total_trades: number;
}

const roles = [
  { id: "user", label: "Bruker", icon: User, color: "bg-slate-500" },
  { id: "beta", label: "Beta", icon: Star, color: "bg-amber-500" },
  { id: "premium", label: "Premium", icon: Award, color: "bg-emerald-500" },
  { id: "master", label: "Master", icon: GraduationCap, color: "bg-blue-500" },
  { id: "phd", label: "PhD", icon: Crown, color: "bg-indigo-500" },
  { id: "professor", label: "Professor", icon: Crown, color: "bg-pink-500" },
  { id: "admin", label: "Admin", icon: Shield, color: "bg-red-500" },
];

const tiers = [
  { id: "student", label: "Gratis", color: "bg-slate-500" },
  { id: "bachelor", label: "Bachelor (Copy 1)", color: "bg-blue-500" },
  { id: "master", label: "Master (Copy 3)", color: "bg-emerald-500" },
  { id: "phd", label: "PhD (Live)", color: "bg-indigo-500" },
  { id: "professor", label: "Professor (VIP)", color: "bg-amber-500" },
];

const sources = [
  { id: "organic", label: "Organisk" },
  { id: "google_ads", label: "Google Ads" },
  { id: "referral", label: "Referral" },
  { id: "social", label: "Sosialt" },
  { id: "partner", label: "Partner" },
  { id: "beta_invite", label: "Beta Invitasjon" },
];

export default function ClientAdminUsers() {
  const t = useTranslations("admin");
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
      setUsers((data as unknown as UserData[]) || []);
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

  const handleUpgrade = async (_newTier: string) => {
    if (!selectedUser) return;

    setUpgrading(true);
    try {
      const {
        data: { user: _user },
      } = await supabase.auth.getUser();

      // TODO: Create admin_upgrade_user RPC in DB
      // const { data, error } = await supabase.rpc("admin_upgrade_user", {
      //   p_user_id: selectedUser.id,
      //   p_new_tier: newTier,
      //   p_admin_id: user?.id,
      // });
      // if (error) throw error;

      toast.info("Upgrade feature coming soon");
      setShowUpgradeModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error upgrading user:", error);
      toast.error("Kunne ikke oppgradere bruker");
    } finally {
      setUpgrading(false);
    }
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
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${roleConfig.color} bg-opacity-20 text-white`}
      >
        <Icon className="w-3 h-3" />
        {roleConfig.label}
      </span>
    );
  };

  const getTierBadge = (tier: string) => {
    const tierConfig = tiers.find((t) => t.id === tier) || tiers[0];
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${tierConfig.color} bg-opacity-20 text-white`}
      >
        {tierConfig.label}
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#0052FF]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#0052FF]"
        >
          <option value="all">Alle roller</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#0052FF]"
        >
          <option value="all">Alle nivåer</option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#0052FF]"
        >
          <option value="all">Alle kilder</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
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
                    aria-label="Velg alle brukere"
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
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    {getTierBadge(user.subscription_tier)}
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-slate-400 capitalize">
                      {sources.find((s) => s.id === user.source)?.label ||
                        user.source}
                    </span>
                  </td>
                  <td className={TABLE.cellNumeric}>
                    <span className="text-slate-400 tabular-nums">
                      {formatDate(user.created_at)}
                    </span>
                  </td>
                  <td className={TABLE.cell}>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowUpgradeModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#0052FF]/20 text-[#6FA3FF] rounded-lg hover:bg-[#0052FF]/30 transition-colors text-xs font-medium"
                    >
                      <ArrowUpCircle className="w-3 h-3" />
                      Oppgrader
                    </button>
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
                    <span className="text-white font-medium">{tier.label}</span>
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
    </div>
  );
}
