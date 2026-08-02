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
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  BarChart3
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface Trade {
  id: string;
  status: string;
  created_at: string;
  total_pnl?: number;
}

interface Metrics {
  timestamp: string;
  tradesPerMinute: number;
  tradesTrend: number;
  activeUsers: number;
  successRate: number;
  recentTrades: Trade[];
}

interface Props {
  initialMetrics: Metrics;
}

export function MonitorDashboardClient({ initialMetrics }: Props) {
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("live");
  const [history, setHistory] = useState<Array<{
    time: string;
    trades: number;
    users: number;
    rate: number;
  }>>([]);

  // Initialize history
  useEffect(() => {
    const now = new Date().toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
    setHistory([{
      time: now,
      trades: initialMetrics.tradesPerMinute,
      users: initialMetrics.activeUsers,
      rate: initialMetrics.successRate,
    }]);
  }, [initialMetrics]);

  const refreshMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health/metrics");
      const newData = await res.json();
      setMetrics(newData);
      
      const now = new Date().toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
      setHistory(prev => [...prev.slice(-30), {
        time: now,
        trades: newData.tradesPerMinute,
        users: newData.activeUsers,
        rate: newData.successRate,
      }]);
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 10 seconds for live trading
  useEffect(() => {
    const interval = setInterval(refreshMetrics, 10000);
    return () => clearInterval(interval);
  }, [refreshMetrics]);

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value <= thresholds.critical) return "text-red-600";
    if (value <= thresholds.warning) return "text-yellow-600";
    return "text-green-600";
  };

  const successfulTrades = metrics.recentTrades.filter(t => t.status === "completed").length;
  const failedTrades = metrics.recentTrades.filter(t => t.status === "failed").length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Activity className="w-8 h-8 text-green-600 animate-pulse" />
              Live Trading Monitor
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Sanntidsovervåking av trading-systemet
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              Sist oppdatert: {new Date(metrics.timestamp).toLocaleTimeString("no-NO")}
            </span>
            <Button
              variant="outline"
              onClick={refreshMetrics}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Oppdater
            </Button>
          </div>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center gap-2 text-sm text-green-600">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          LIVE - Oppdaterer hvert 10. sekund
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Handler/min</p>
                  <p className={`text-3xl font-bold ${getStatusColor(metrics.tradesPerMinute, { warning: 5, critical: 1 })}`}>
                    {metrics.tradesPerMinute}
                  </p>
                  <p className="text-xs text-slate-400">Siste minutt</p>
                </div>
                <Zap className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Aktive Brukere</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {metrics.activeUsers}
                  </p>
                  <p className="text-xs text-slate-400">Siste time</p>
                </div>
                <Users className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Suksessrate</p>
                  <p className={`text-3xl font-bold ${getStatusColor(metrics.successRate, { warning: 80, critical: 50 })}`}>
                    {metrics.successRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-slate-400">Login & trades</p>
                </div>
                <CheckCircle className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Trend (5min)</p>
                  <p className={`text-3xl font-bold ${metrics.tradesTrend > metrics.tradesPerMinute * 5 ? "text-green-600" : "text-yellow-600"}`}>
                    {metrics.tradesTrend}
                  </p>
                  <p className="text-xs text-slate-400">Totalt siste 5 min</p>
                </div>
                <TrendingUp className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="live">Live Graf</TabsTrigger>
            <TabsTrigger value="trades">Siste Handler</TabsTrigger>
            <TabsTrigger value="alerts">Varsler</TabsTrigger>
          </TabsList>

          {/* Live Chart */}
          <TabsContent value="live" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Handler per minutt (sanntid)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="tradesGradient" x1="0" y1="0" x2="0" y2="1">
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
                        dataKey="trades" 
                        stroke="#10b981" 
                        fillOpacity={1} 
                        fill="url(#tradesGradient)" 
                        name="Handler/min"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Aktive Brukere</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="users" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name="Brukere"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Suksessrate %</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="rate" 
                          stroke="#8b5cf6" 
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name="Suksessrate %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Recent Trades */}
          <TabsContent value="trades">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Siste Handler (siste time)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {metrics.recentTrades.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">Ingen handler siste time</p>
                  ) : (
                    metrics.recentTrades.map((trade) => (
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
                          <Badge variant={trade.status === "completed" ? "default" : trade.status === "failed" ? "destructive" : "secondary"}>
                            {trade.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Systemvarsler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.tradesPerMinute < 1 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription>
                        Ingen handler siste minutt - sjekk trading-scheduler
                      </AlertDescription>
                    </Alert>
                  )}
                  {metrics.successRate < 80 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription>
                        Suksessrate under 80% - sjekk auth og trading-system
                      </AlertDescription>
                    </Alert>
                  )}
                  {metrics.activeUsers === 0 && (
                    <Alert>
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription>
                        Ingen aktive brukere - sjekk påloggingsflyt
                      </AlertDescription>
                    </Alert>
                  )}
                  {metrics.tradesPerMinute >= 1 && metrics.successRate >= 80 && (
                    <div className="text-center py-8 text-slate-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                      <p>Ingen aktive varsler - systemet kjører normalt</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
