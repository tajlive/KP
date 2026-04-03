"use client";

import { useState, useEffect } from "react";
import {
  getGoogleConsoleConfig,
  getAllRedirectUris,
  isValidRedirectUri,
  getGoogleConsoleCopyPaste,
} from "@/lib/auth/dynamic-redirects";
import { signInWithGoogle } from "@/lib/auth/googleAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface DiagnosisData {
  status: string;
  timestamp: string;
  checks: {
    supabase_url: boolean;
    supabase_anon_key: boolean;
    app_url: string | null;
  };
  google_oauth: {
    configured: boolean;
    redirect_uris: {
      expected: string[];
      valid: boolean;
    };
  };
}

export function OAuthDebugClient() {
  const [activeTab, setActiveTab] = useState("overview");
  const [diagnosis, setDiagnosis] = useState<DiagnosisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const googleConfig = getGoogleConsoleConfig();
  const allUris = getAllRedirectUris("/auth/callback");

  const fetchDiagnosis = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/diagnose");
      const data = await res.json();
      setDiagnosis(data);
    } catch (error) {
      console.error("Failed to fetch diagnosis:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnosis();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const testGoogleOAuth = async () => {
    setTestResult("Initiating OAuth flow...");
    try {
      await signInWithGoogle();
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const envVars = [
    { name: "NEXT_PUBLIC_SUPABASE_URL", value: process.env.NEXT_PUBLIC_SUPABASE_URL || "(not set)", required: true },
    { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✓ Set (hidden)" : "(not set)", required: true },
    { name: "NEXT_PUBLIC_APP_URL", value: process.env.NEXT_PUBLIC_APP_URL || "(not set)", required: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              OAuth Debug Console
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Development-only diagnostic tool for Google OAuth configuration
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchDiagnosis}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Status Alert */}
        {diagnosis?.status === "error" && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Configuration errors detected. Check the details below.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="redirects">Redirect URIs</TabsTrigger>
            <TabsTrigger value="google">Google Console</TabsTrigger>
            <TabsTrigger value="test">Test Flow</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge
                    variant={diagnosis?.status === "ok" ? "default" : "destructive"}
                    className="text-lg px-3 py-1"
                  >
                    {diagnosis?.status?.toUpperCase() || "Loading..."}
                  </Badge>
                  <p className="text-xs text-slate-500 mt-2">
                    Last checked: {diagnosis?.timestamp ? new Date(diagnosis.timestamp).toLocaleTimeString() : "-"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Supabase</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    {diagnosis?.checks.supabase_url ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm">URL Configured</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {diagnosis?.checks.supabase_anon_key ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm">Anon Key Set</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">App URL</CardTitle>
                </CardHeader>
                <CardContent>
                  <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded block truncate">
                    {diagnosis?.checks.app_url || "(not set)"}
                  </code>
                </CardContent>
              </Card>
            </div>

            {/* Environment Variables */}
            <Card>
              <CardHeader>
                <CardTitle>Environment Variables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {envVars.map((env) => (
                    <div
                      key={env.name}
                      className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={env.required ? "default" : "secondary"}>
                          {env.required ? "Required" : "Optional"}
                        </Badge>
                        <code className="text-sm font-mono">{env.name}</code>
                      </div>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {env.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Redirect URIs Tab */}
          <TabsContent value="redirects" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Redirect URIs</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(allUris.map(u => u.fullUri).join("\n"), "uris")}
                >
                  {copied === "uris" ? "Copied!" : <Copy className="w-4 h-4" />}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {allUris.map((uri) => {
                    const valid = isValidRedirectUri(uri.fullUri);
                    return (
                      <div
                        key={uri.locale}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          valid
                            ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                            : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{uri.locale}</Badge>
                          <code className="text-sm font-mono">{uri.fullUri}</code>
                        </div>
                        {valid ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Cookie Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Cookie Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-center">
                    <p className="text-sm text-slate-500">sameSite</p>
                    <p className="text-lg font-mono font-bold">none</p>
                  </div>
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-center">
                    <p className="text-sm text-slate-500">secure</p>
                    <p className="text-lg font-mono font-bold text-green-600">true</p>
                  </div>
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-center">
                    <p className="text-sm text-slate-500">encoding</p>
                    <p className="text-lg font-mono font-bold">raw</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
                  Required for cross-domain OAuth flows. Third-party cookies must be enabled in browser.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Google Console Tab */}
          <TabsContent value="google" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Google Cloud Console Config</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(getGoogleConsoleCopyPaste(), "google")}
                >
                  {copied === "google" ? "Copied!" : <Copy className="w-4 h-4" />}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Authorized JavaScript Origins</h4>
                  <div className="space-y-1">
                    {googleConfig.authorizedJavaScriptOrigins.map((origin) => (
                      <code
                        key={origin}
                        className="block text-sm bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded"
                      >
                        {origin}
                      </code>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Authorized Redirect URIs</h4>
                  <div className="space-y-1">
                    {googleConfig.authorizedRedirectUris.map((uri) => (
                      <code
                        key={uri}
                        className="block text-sm bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded"
                      >
                        {uri}
                      </code>
                    ))}
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    Important Notes
                  </h4>
                  <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    {googleConfig.notes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => window.open("https://console.cloud.google.com/apis/credentials", "_blank")}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Google Cloud Console
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Flow Tab */}
          <TabsContent value="test" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Test OAuth Flow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Click below to initiate a Google OAuth flow. This will help verify that your
                  configuration is working correctly.
                </p>

                <Button
                  onClick={testGoogleOAuth}
                  className="w-full h-12 gap-2"
                  disabled={diagnosis?.status === "error"}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Test Google Sign-In
                </Button>

                {testResult && (
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm font-mono">{testResult}</p>
                  </div>
                )}

                {diagnosis?.status === "error" && (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      Configuration errors detected. Fix issues in other tabs before testing.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Common Issues */}
            <Card>
              <CardHeader>
                <CardTitle>Common Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg">
                    <h4 className="font-medium text-red-800 dark:text-red-200">redirect_uri_mismatch</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      The redirect URI in Google Console doesn&apos;t match exactly. Check for trailing slashes,
                      protocol differences (http vs https), or missing locale prefixes.
                    </p>
                  </div>

                  <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg">
                    <h4 className="font-medium text-red-800 dark:text-red-200">access_denied</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      OAuth consent screen is in testing mode. Go to Google Console → APIs & Services →
                      OAuth consent screen and click &quot;PUBLISH APP&quot;.
                    </p>
                  </div>

                  <div className="p-4 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Cookies blocked</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Third-party cookies are disabled. Enable cookies for accounts.google.com in
                      browser settings, or test in a standard (non-incognito) window.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-sm text-slate-500 pt-4">
          <p>
            Run CLI verifier:{' '}
            <code className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">
              npx ts-node scripts/google-oauth-verifier.ts
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
