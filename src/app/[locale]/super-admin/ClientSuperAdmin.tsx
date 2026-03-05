"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/utils";
import { Profile, Trade } from "@/types/database";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Database,
  Download,
  LucideIcon,
  Pause,
  RefreshCw,
  Settings,
  Shield,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const SUPER_ADMIN_EMAIL = "tomarnejensen@gmail.com";

export default function ClientSuperAdmin() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [_loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeAutoTrading: 0,
    totalTrades: 0,
    adminUsers: 0,
  });
  const [users, setUsers] = useState<Profile[]>([]);
  const [trades, setTrades] = useState<
    Array<Trade & { user?: { email?: string } }>
  >([]);

  const [sessions, setSessions] = useState<
    Array<{
      id: string;
      phase?: string;
      status?: string;
      current_balance?: number;
      user?: { email?: string };
    }>
  >([]);

  useEffect(() => {
    checkAuthorization();
  }, []);

  const checkAuthorization = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      toast.error("Du har ikke tilgang til denne siden");
      router.push("/");
      return;
    }

    setIsAuthorized(true);
    loadAllData();
  };

  const loadAllData = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: adminCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      const { count: tradingCount } = await supabase
        .from("trading_sessions")
        .select("*", { count: "exact", head: true })
        .eq("status", "ACTIVE");

      const { count: tradesCount } = await supabase
        .from("trades")
        .select("*", { count: "exact", head: true });

      setStats({
        totalUsers: userCount || 0,
        activeAutoTrading: tradingCount || 0,
        totalTrades: tradesCount || 0,
        adminUsers: adminCount || 0,
      });

      const { data: usersData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      setUsers(usersData || []);

      const { data: tradesData } = await supabase
        .from("trades")
        .select("*, user:user_id(email)")
        .order("executed_at", { ascending: false })
        .limit(50);

      setTrades(tradesData || []);

      const { data: sessionsData } = await supabase
        .from("trading_sessions")
        .select("*, user:user_id(email)")
        .order("created_at", { ascending: false });

      setSessions(sessionsData || []);
    } catch (error) {
      toast.error("Kunne ikke laste data");
    } finally {
      setLoading(false);
    }
  };

  const handleMakeAdmin = async (userId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", userId);

    if (error) toast.error("Kunne ikke oppdatere rolle");
    else {
      toast.success("Bruker er nå admin");
      loadAllData();
    }
  };

  const handlePauseTrading = async (sessionId: string) => {
    const supabase = createClient();
    await supabase
      .from("trading_sessions")
      .update({ status: "PAUSED", paused_reason: "ADMIN_OVERRIDE" })
      .eq("id", sessionId);

    toast.success("Trading pauset av admin");
    loadAllData();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Er du sikker? Dette kan ikke angres!")) return;

    const supabase = createClient();
    await supabase.from("trades").delete().eq("user_id", userId);
    await supabase.from("trading_sessions").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);

    toast.success("Bruker slettet");
    loadAllData();
  };

  const handleExportData = () => {
    const data = {
      users,
      trades,
      sessions,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `klarpakke-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    toast.success("Data eksportert");
  };

  const handleEmergencyStop = async () => {
    if (!confirm("STOPPE ALL TRADING FOR ALLE BRUKERE?")) return;

    const supabase = createClient();
    await supabase
      .from("trading_sessions")
      .update({ status: "STOPPED", stopped_reason: "ADMIN_EMERGENCY" })
      .eq("status", "ACTIVE");

    toast.success("All trading stoppet!");
    loadAllData();
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Ingen Tilgang
            </h1>
            <p className="text-slate-400">
              Kun {SUPER_ADMIN_EMAIL} har tilgang.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-red-500" />
            <div>
              <h1 className="text-xl font-bold">Super Admin</h1>
              <p className="text-xs text-slate-400">{SUPER_ADMIN_EMAIL}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadAllData}
              className="border-slate-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Oppdater
            </Button>
            <Button
              variant="outline"
              onClick={handleExportData}
              className="border-slate-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Eksporter
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Totalt Brukere"
            value={stats.totalUsers}
            icon={Users}
            color="text-blue-400"
          />
          <StatCard
            title="Aktive Auto-Trading"
            value={stats.activeAutoTrading}
            icon={Activity}
            color="text-green-400"
          />
          <StatCard
            title="Totale Trades"
            value={stats.totalTrades}
            icon={TrendingUp}
            color="text-amber-400"
          />
          <StatCard
            title="Admin Brukere"
            value={stats.adminUsers}
            icon={Shield}
            color="text-emerald-400"
          />
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="users">Brukere ({users.length})</TabsTrigger>
            <TabsTrigger value="trades">Trades ({trades.length})</TabsTrigger>
            <TabsTrigger value="sessions">
              Sessions ({sessions.length})
            </TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <UsersTable
              users={users}
              onMakeAdmin={handleMakeAdmin}
              onDelete={handleDeleteUser}
            />
          </TabsContent>

          <TabsContent value="trades" className="space-y-4">
            <TradesTable trades={trades} />
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <SessionsTable sessions={sessions} onPause={handlePauseTrading} />
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <SystemPanel onEmergencyStop={handleEmergencyStop} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-sm">{title}</p>
            <p className="text-3xl font-bold text-white mt-2">
              {value.toLocaleString()}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800">
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UsersTable({
  users,
  onMakeAdmin,
  onDelete,
}: {
  users: Profile[];
  onMakeAdmin: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = users.filter((u) =>
    u.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Alle Brukere</CardTitle>
          <Input
            placeholder="Søk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 bg-slate-800 border-slate-700"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-3 px-4 text-slate-400">E-post</th>
                <th className="text-left py-3 px-4 text-slate-400">Rolle</th>
                <th className="text-left py-3 px-4 text-slate-400">
                  Registrert
                </th>
                <th className="text-right py-3 px-4 text-slate-400">
                  Handlinger
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30"
                >
                  <td className="py-3 px-4 text-white">{user.email}</td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                    >
                      {user.role || "user"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {new Date(user.created_at as string).toLocaleDateString(
                      "nb-NO",
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.role !== "admin" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onMakeAdmin(user.id)}
                          className="border-blue-500/30 text-blue-400"
                        >
                          <Shield className="w-4 h-4 mr-1" />
                          Admin
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(user.id)}
                        className="border-red-500/30 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TradesTable({
  trades,
}: {
  trades: Array<Trade & { user?: { email?: string } }>;
}) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Siste Trades</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-3 px-4 text-slate-400">Bruker</th>
                <th className="text-left py-3 px-4 text-slate-400">Symbol</th>
                <th className="text-left py-3 px-4 text-slate-400">Side</th>
                <th className="text-right py-3 px-4 text-slate-400">P&L</th>
                <th className="text-left py-3 px-4 text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-b border-slate-800/50">
                  <td className="py-3 px-4 text-slate-300 text-sm">
                    {trade.user?.email}
                  </td>
                  <td className="py-3 px-4 text-white font-medium">
                    {trade.symbol}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant="outline"
                      className={
                        trade.side === "LONG"
                          ? "border-green-500/30 text-green-400"
                          : "border-red-500/30 text-red-400"
                      }
                    >
                      {trade.side}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={
                        (trade.realized_pnl ?? 0) > 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {(trade.realized_pnl ?? 0) > 0 ? "+" : ""}$
                      {trade.realized_pnl?.toFixed(2) || "0.00"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        trade.status === "OPEN" ? "default" : "secondary"
                      }
                    >
                      {trade.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionsTable({
  sessions,
  onPause,
}: {
  sessions: Array<{
    id: string;
    phase?: string;
    status?: string;
    current_balance?: number;
    user?: { email?: string };
  }>;
  onPause: (id: string) => void;
}) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Trading Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-3 px-4 text-slate-400">Bruker</th>
                <th className="text-left py-3 px-4 text-slate-400">Fase</th>
                <th className="text-left py-3 px-4 text-slate-400">Status</th>
                <th className="text-right py-3 px-4 text-slate-400">
                  Balanser
                </th>
                <th className="text-right py-3 px-4 text-slate-400">
                  Handling
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-b border-slate-800/50">
                  <td className="py-3 px-4 text-slate-300 text-sm">
                    {session.user?.email}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="capitalize">
                      {session.phase}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      className={
                        session.status === "ACTIVE"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-amber-500/20 text-amber-400"
                      }
                    >
                      {session.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-300">
                    ${session.current_balance?.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {session.status === "ACTIVE" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onPause(session.id)}
                        className="border-amber-500/30 text-amber-400"
                      >
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemPanel({ onEmergencyStop }: { onEmergencyStop: () => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Database className="w-5 h-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <span className="text-slate-400">Supabase</span>
            <Badge className="bg-green-500/20 text-green-400">
              <CheckCircle className="w-3 h-3 mr-1" />
              Tilkoblet
            </Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <span className="text-slate-400">Realtime</span>
            <Badge className="bg-green-500/20 text-green-400">Aktiv</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400">Edge Functions</span>
            <Badge className="bg-green-500/20 text-green-400">Klar</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Admin Handlinger
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start border-slate-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Kjør Daglig Analyse
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start border-slate-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Eksporter Alle Data
          </Button>
          <Button
            variant="outline"
            onClick={onEmergencyStop}
            className="w-full justify-start border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Nødstopp ALL Trading
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
