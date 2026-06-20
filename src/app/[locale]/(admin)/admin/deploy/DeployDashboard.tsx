"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { 
  Rocket, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Terminal,
  Clock,
  Shield,
  MessageSquare,
  Activity
} from "lucide-react";

interface DeploymentStep {
  id: string;
  name: string;
  status: "pending" | "running" | "success" | "error" | "skipped";
  duration?: number;
  message?: string;
}

interface HealthCheck {
  timestamp: string;
  status: "healthy" | "degraded" | "critical";
  checks: {
    database: { status: string; latency_ms: number; message?: string };
    trades: { status: string; count: number; message?: string };
    auth: { status: string; message?: string };
  };
  alerts: string[];
}

interface SlackMessage {
  channel: string;
  text: string;
  timestamp?: string;
}

export function DeployDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentSteps, setDeploymentSteps] = useState<DeploymentStep[]>([
    { id: "preflight", name: "Pre-flight Checks", status: "pending" },
    { id: "oauth", name: "OAuth Verification", status: "pending" },
    { id: "coolify", name: "Coolify Deploy", status: "pending" },
    { id: "glitchtip", name: "GlitchTip Alerts", status: "pending" },
    { id: "health", name: "Health Check", status: "pending" },
    { id: "notify", name: "Slack Notification", status: "pending" },
  ]);
  const [healthData, setHealthData] = useState<HealthCheck | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [slackMessages, setSlackMessages] = useState<SlackMessage[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const runDeployment = async () => {
    setIsDeploying(true);
    setLogs([]);
    
    // Reset steps
    setDeploymentSteps(steps => 
      steps.map(s => ({ ...s, status: "pending", duration: undefined, message: undefined }))
    );

    // Simulate deployment steps
    const steps = ["preflight", "oauth", "coolify", "glitchtip", "health", "notify"];
    
    for (const stepId of steps) {
      // Update step to running
      setDeploymentSteps(prev => 
        prev.map(s => s.id === stepId ? { ...s, status: "running" } : s)
      );
      
      addLog(`Starting: ${stepId}...`);
      
      // Simulate work
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000));
      
      const success = Math.random() > 0.1; // 90% success rate for demo
      
      setDeploymentSteps(prev => 
        prev.map(s => 
          s.id === stepId 
            ? { 
                ...s, 
                status: success ? "success" : "error",
                duration: Math.floor(1000 + Math.random() * 3000),
                message: success ? undefined : "Failed verification"
              } 
            : s
        )
      );
      
      addLog(`${stepId}: ${success ? "SUCCESS" : "FAILED"}`);
      
      if (!success) {
        addLog("Deployment halted due to error");
        setIsDeploying(false);
        return;
      }
    }
    
    addLog("🎉 Deployment completed successfully!");
    setIsDeploying(false);
    
    // Simulate Slack notification
    setSlackMessages(prev => [{
      channel: "#deployments",
      text: "🚀 Klarpakke production deployment completed successfully!",
      timestamp: new Date().toISOString(),
    }, ...prev]);
  };

  const runHealthCheck = async () => {
    addLog("Running health check...");
    
    // Simulate API call
    await new Promise(r => setTimeout(r, 1000));
    
    const mockHealth: HealthCheck = {
      timestamp: new Date().toISOString(),
      status: Math.random() > 0.7 ? "healthy" : Math.random() > 0.5 ? "degraded" : "critical",
      checks: {
        database: {
          status: "ok",
          latency_ms: 45,
        },
        trades: {
          status: "ok",
          count: 1247,
        },
        auth: {
          status: "ok",
        },
      },
      alerts: [],
    };
    
    if (mockHealth.status !== "healthy") {
      mockHealth.alerts.push("Auto-trades count is lower than expected");
    }
    
    setHealthData(mockHealth);
    addLog(`Health check: ${mockHealth.status.toUpperCase()}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
      case "healthy":
      case "ok":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
      case "critical":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "warning":
      case "degraded":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "running":
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      healthy: "default",
      ok: "default",
      success: "default",
      degraded: "secondary",
      warning: "secondary",
      critical: "destructive",
      error: "destructive",
      pending: "outline",
    };
    
    return <Badge variant={variants[status] || "outline"}>{status.toUpperCase()}</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Rocket className="w-8 h-8" />
              Production Deployment
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Deploy Klarpakke to production with automated verification
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={runHealthCheck}
              disabled={isDeploying}
              className="gap-2"
            >
              <Activity className="w-4 h-4" />
              Health Check
            </Button>
            <Button
              onClick={runDeployment}
              disabled={isDeploying}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {isDeploying ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4" />
              )}
              {isDeploying ? "Deploying..." : "Deploy to Production"}
            </Button>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Environment</p>
                  <p className="text-2xl font-bold text-green-600">Production</p>
                </div>
                <Shield className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Last Deploy</p>
                  <p className="text-2xl font-bold">2h ago</p>
                </div>
                <Clock className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Health Status</p>
                  <div className="mt-1">
                    {getStatusBadge(healthData?.status || "unknown")}
                  </div>
                </div>
                <Activity className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Active Alerts</p>
                  <p className="text-2xl font-bold text-slate-700">
                    {healthData?.alerts?.length || 0}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="slack">Slack</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5" />
                  Deployment Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deploymentSteps.map((step) => (
                    <div
                      key={step.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        step.status === "error" 
                          ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" 
                          : step.status === "success"
                          ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                          : step.status === "running"
                          ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                          : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(step.status)}
                        <div>
                          <p className="font-medium">{step.name}</p>
                          {step.message && (
                            <p className="text-sm text-red-600 dark:text-red-400">{step.message}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {step.duration && (
                          <span className="text-sm text-slate-500">{step.duration}ms</span>
                        )}
                        {getStatusBadge(step.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Health Tab */}
          <TabsContent value="health" className="space-y-4">
            {healthData ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Database</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(healthData.checks.database.status)}
                        <span className="text-2xl font-bold">
                          {healthData.checks.database.latency_ms}ms
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Auto Trades</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(healthData.checks.trades.status)}
                        <span className="text-2xl font-bold">
                          {healthData.checks.trades.count}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Auth</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(healthData.checks.auth.status)}
                        <span className="text-lg font-medium">Operational</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {healthData.alerts.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside mt-2">
                        {healthData.alerts.map((alert, i) => (
                          <li key={i}>{alert}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">
                    Run a health check to see system status
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={runHealthCheck}
                    className="mt-4"
                  >
                    Run Health Check
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  Deployment Logs
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLogs([])}
                >
                  Clear
                </Button>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto">
                  {logs.length === 0 ? (
                    <p className="text-slate-500">No logs yet. Start a deployment to see logs.</p>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="text-slate-300">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Slack Tab */}
          <TabsContent value="slack">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Slack Notifications
                </CardTitle>
                <Badge variant="outline">#deployments</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {slackMessages.length === 0 ? (
                    <p className="text-slate-600 dark:text-slate-400 text-center py-8">
                      No notifications sent yet
                    </p>
                  ) : (
                    slackMessages.map((msg, i) => (
                      <div
                        key={i}
                        className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">{msg.channel}</Badge>
                          <span className="text-xs text-slate-500">
                            {new Date(msg.timestamp || Date.now()).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    ))
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
