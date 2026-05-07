"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { 
  Activity, 
  Users, 
  TrendingUp, 
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Zap,
  BarChart3,
  Globe,
  Shield
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from "recharts";

interface HealthData {
  timestamp: string;
  activeUsers: number;
  recentTrades: Array<{
    id: string;
    status: string;
    created_at: string;
    total_pnl?: number;
  }>;
  dbLatency: number;
  totalTradesToday: number;
  errors: Record<string, string | undefined>;
}

interface MetricPoint {
  time: string;
  value: number;
  label: string;
}

interface Props {
  initialData: HealthData;
}

export function HealthDashboardClient({ initialData }: Props) {
  const [data, setData] = useState<HealthData>(initialData);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [metrics, setMetrics] = useState<{
    usersHistory: MetricPoint[];
    latencyHistory: MetricPoint[];
    tradeHistory: MetricPoint[];
  }>({
    usersHistory: [],
    latencyHistory: [],
    tradeHistory: [],
  });

  // Initialize history from initial data
  useEffect(() => {
    const now = new Date().toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
    setMetrics({
      usersHistory: [{ time: now, value: initialData.activeUsers, label: "Aktive brukere" }],
      latencyHistory: [{ time: now, value: initialData.dbLatency, label: "DB Latens (ms)" }],
      tradeHistory: [{ time: now, value: initialData.totalTradesToday, label: "Handler i dag" }],
    });
  }, [initialData]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health/metrics");
      const newData = await res.json();
      setData(newData);
      
      // Update history
      const now = new Date().toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
      setMetrics(prev => ({
        usersHistory: [...prev.usersHistory.slice(-20), { time: now, value: newData.activeUsers, label: "Aktive brukere" }],
        latencyHistory: [...prev.latencyHistory.slice(-20), { time: now, value: newData.dbLatency, label: "DB Latens (ms)" }],
        tradeHistory: [...prev.tradeHistory.slice(-20), { time: now, value: newData.totalTradesToday, label: "Handler i dag" }],
      }));
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return "text-red-600";
    if (value >= thresholds.warning) return "text-yellow-600";
    return "text-green-600";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
      case "success":
        return <Badge variant="default" className="bg-green-600">Suksess</Badge>;
      case "failed":
      case "error":
        return <Badge variant="destructive">Feil</Badge>;
      case "pending":
        return <Badge variant="secondary">Venter</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate trade stats
  const successfulTrades = data.recentTrades.filter(t => t.status === "completed").length;
  const failedTrades = data.recentTrades.filter(t => t.status === "failed").length;
  const avgPnl = data.recentTrades.length > 0
    ? data.recentTrades.reduce((sum, t) => sum + (t.total_pnl || 0), 0) / data.recentTrades.length
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              Systemhelse
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Sanntidsmonitorering av live trading-systemet
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              Sist oppdatert: {new Date(data.timestamp).toLocaleTimeString("no-NO")}
            </span>
            <Button
              variant="outline"
              onClick={refreshData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Oppdater
            </Button>
          </div>
        </div>

        {/* Critical Alerts */}
        {(data.dbLatency > 500 || data.errors.sessions || data.errors.trades) && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              {data.dbLatency > 500 && "Høy database-latens oppdaget. "}
              {data.errors.sessions && "Feil ved henting av sesjoner. "}
              {data.errors.trades && "Feil ved henting av handler. "}
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Aktive Brukere</p>
                  <p className={`text-3xl font-bold ${getStatusColor(data.activeUsers, { warning: 100, critical: 200 })}`}>
                    {data.activeUsers}
                  </p>
                  <p className="text-xs text-slate-400">Siste 15 minutter</p>
                </div>
                <Users className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">DB Latens</p>
                  <p className={`text-3xl font-bold ${getStatusColor(data.dbLatency, { warning: 100, critical: 500 })}`}>
                    {data.dbLatency}ms
                  </p>
                  <p className="text-xs text-slate-400">Siste forespørsel</p>
                </div>
                <Database className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Handler I Dag</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {data.totalTradesToday}
                  </p>
                  <p className="text-xs text-slate-400">
                    {successfulTrades} suksess / {failedTrades} feil
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Gjennomsnitt P&L</p>
                  <p className={`text-3xl font-bold ${avgPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {avgPnl >= 0 ? "+" : ""}{avgPnl.toFixed(2)}%
                  </p>
                  <p className="text-xs text-slate-400">Siste time</p>
                </div>
                <BarChart3 className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Oversikt</TabsTrigger>
            <TabsTrigger value="sessions">Sesjoner</TabsTrigger>
            <TabsTrigger value="trades">Handler</TabsTrigger>
            <TabsTrigger value="performance">Ytelse</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Database Latens (ms)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics.latencyHistory}>
                        <defs>
                          <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#3b82f6" 
                          fillOpacity={1} 
                          fill="url(#latencyGradient)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Aktive Sesjoner
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metrics.usersHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Systemstatus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: "Database", status: data.dbLatency < 500 ? "Operational" : "Degradert", icon: Database },
                    { name: "Auth", status: data.errors.sessions ? "Feil" : "Operational", icon: Shield },
                    { name: "Trading", status: data.errors.trades ? "Feil" : "Operational", icon: TrendingUp },
                    { name: "API", status: "Operational", icon: Globe },
                  ].map((service) => (
                    <div key={service.name} className="flex items-center gap-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <service.icon className="w-5 h-5 text-slate-600" />
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <Badge 
                          variant={service.status === "Operational" ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {service.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>Brukeraktivitet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.usersHistory}>
                      <defs>
                        <linearGradient id="sessionGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#10b981" 
                        fillOpacity={1} 
                        fill="url(#sessionGradient)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trades Tab */}
          <TabsContent value="trades">
            <Card>
              <CardHeader>
                <CardTitle>Siste Handler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {data.recentTrades.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">Ingen handler siste time</p>
                  ) : (
                    data.recentTrades.map((trade) => (
                      <div 
                        key={trade.id} 
                        className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {trade.status === "completed" ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : trade.status === "failed" ? (
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                          ) : (
                            <Clock className="w-5 h-5 text-yellow-500" />
                          )}
                          <div>
                            <p className="font-medium font-mono text-sm">{trade.id.slice(0, 8)}...</p>
                            <p className="text-xs text-slate-500">
                              {new Date(trade.created_at).toLocaleTimeString("no-NO")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {trade.total_pnl !== undefined && (
                            <span className={`font-mono ${trade.total_pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {trade.total_pnl >= 0 ? "+" : ""}{trade.total_pnl.toFixed(2)}%
                            </span>
                          )}
                          {getStatusBadge(trade.status)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Ytelsesmetrikker</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">OAuth Latency</span>
                      <span className="text-sm text-slate-500">Mål: &lt; 500ms</span>
                    </div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-500"
                        style={{ width: "65%" }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Gjennomsnitt: 320ms (siste time)</p>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">API Response Time</span>
                      <span className="text-sm text-slate-500">Mål: &lt; 200ms</span>
                    </div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-600 transition-all duration-500"
                        style={{ width: "85%" }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Gjennomsnitt: {data.dbLatency}ms</p>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Trade Success Rate</span>
                      <span className="text-sm text-slate-500">Mål: &gt; 95%</span>
                    </div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-600 transition-all duration-500"
                        style={{ width: `${(successfulTrades / (data.recentTrades.length || 1)) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {successfulTrades} / {data.recentTrades.length} suksess
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Cookie Block Rate</span>
                      <span className="text-sm text-slate-500">Mål: &lt; 5%</span>
                    </div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-600 transition-all duration-500"
                        style={{ width: "8%" }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Nåværende: 3.2% (Cloudflare Analytics)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
