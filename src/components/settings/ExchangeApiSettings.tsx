"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/utils";
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  Key,
  Loader2,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  exchange: string;
  label: string;
  api_key: string;
  is_active: boolean;
  last_tested_at: string | null;
  test_status: "success" | "failed" | "pending" | null;
  permissions: {
    spot?: boolean;
    futures?: boolean;
    margin?: boolean;
  };
}

// Binance Referral
const BINANCE_REFERRAL = {
  code: "43427892",
  link: "https://accounts.binance.com/register?ref=43427892",
  benefits: {
    user: "20% rabatt på trading fees",
    referrer: "Støtter videre utvikling av Klarpakke",
  },
};

export function ExchangeApiSettings() {
  const supabase = createClient();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [activeTab, setActiveTab] = useState("list");

  // Form state
  const [form, setForm] = useState({
    label: "Hovedkonto",
    apiKey: "",
    apiSecret: "",
    testnet: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApiKeys(((data || []) as unknown) as ApiKey[]);
    } catch (error) {
      console.error("Error loading API keys:", error);
      toast.error("Kunne ikke laste API-nøkler");
    } finally {
      setLoading(false);
    }
  };

  const maskApiKey = (key: string) => {
    if (!key || key.length < 8) return "••••••••";
    return key.slice(0, 4) + "••••••••" + key.slice(-4);
  };

  const testCredentials = async () => {
    if (!form.apiKey || !form.apiSecret) {
      setErrors({ apiKey: "API Key og Secret er påkrevd" });
      return null;
    }

    setTesting(true);
    setErrors({});
    setSuccess("");

    try {
      const response = await fetch("/api/binance/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: form.apiKey,
          apiSecret: form.apiSecret,
          testnet: form.testnet,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setErrors({ test: data.error || "Kunne ikke koble til Binance" });
        return null;
      }

      setSuccess("✅ Tilkobling vellykket!");
      return data.accountInfo;
    } catch (_error) {
      setErrors({ test: "Nettverksfeil ved testing" });
      return null;
    } finally {
      setTesting(false);
    }
  };

  const saveApiKey = async () => {
    const accountInfo = await testCredentials();
    if (!accountInfo) return;

    setLoading(true);
    try {
      // Use edge function for secure storage
      const { error } = await supabase.functions.invoke("connect-exchange", {
        body: {
          exchange: form.testnet ? "binance_testnet" : "binance",
          api_key: form.apiKey,
          api_secret: form.apiSecret,
          label: form.label,
          is_testnet: form.testnet,
          permissions: {
            spot: accountInfo.permissions?.includes("SPOT") || false,
            futures: accountInfo.permissions?.includes("FUTURES") || false,
            margin: accountInfo.permissions?.includes("MARGIN") || false,
          },
        },
      });

      if (error) throw error;

      toast.success("API-nøkkel lagret!");
      setForm({
        label: "Hovedkonto",
        apiKey: "",
        apiSecret: "",
        testnet: false,
      });
      setShowSecret(false);
      await loadApiKeys();
      setActiveTab("list");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Kunne ikke lagre API-nøkkel");
    } finally {
      setLoading(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm("Er du sikker på at du vil slette denne API-nøkkelen?"))
      return;

    try {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
      await loadApiKeys();
      toast.success("API-nøkkel slettet");
    } catch (_error) {
      toast.error("Feil ved sletting");
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(BINANCE_REFERRAL.link);
    toast.success("Referral link kopiert!");
  };

  const binanceKeys = apiKeys.filter((k) => k.exchange.includes("binance"));

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Key className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Tilkoblede Børser</p>
                <p className="text-xl font-bold text-white">
                  {new Set(apiKeys.map((k) => k.exchange)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Aktive Nøkler</p>
                <p className="text-xl font-bold text-white">
                  {apiKeys.filter((k) => k.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <ExternalLink className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Binance Referral</p>
                <p className="text-xl font-bold text-white">
                  {BINANCE_REFERRAL.code}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900 border-slate-800">
          <TabsTrigger
            value="list"
            className="data-[state=active]:bg-slate-800"
          >
            Dine API-nøkler
          </TabsTrigger>
          <TabsTrigger value="add" className="data-[state=active]:bg-slate-800">
            Legg til ny
          </TabsTrigger>
          <TabsTrigger
            value="guide"
            className="data-[state=active]:bg-slate-800"
          >
            Veiledning
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : apiKeys.length === 0 ? (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-12 text-center">
                <Key className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Ingen API-nøkler
                </h3>
                <p className="text-slate-400 mb-4">
                  Legg til din første API-nøkkel for å starte trading
                </p>
                <Button
                  onClick={() => setActiveTab("add")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Legg til API-nøkkel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {/* Binance Section */}
              {binanceKeys.length > 0 && (
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Image
                        src="/binance-logo.svg"
                        alt="Binance"
                        width={24}
                        height={24}
                      />
                      Binance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {binanceKeys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700"
                      >
                        <div className="flex items-center gap-4">
                          {key.test_status === "success" ? (
                            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                              <Check className="w-5 h-5 text-green-400" />
                            </div>
                          ) : key.test_status === "failed" ? (
                            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                              <X className="w-5 h-5 text-red-400" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                              <AlertCircle className="w-5 h-5 text-amber-400" />
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-white">
                                {key.label}
                              </h3>
                              {key.exchange.includes("testnet") && (
                                <Badge
                                  variant="outline"
                                  className="text-amber-400 border-amber-400/30"
                                >
                                  Testnet
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-400 font-mono">
                              {maskApiKey(key.api_key)}
                            </p>
                            {key.last_tested_at && (
                              <p className="text-xs text-slate-500 mt-1">
                                Sist testet:{" "}
                                {new Date(key.last_tested_at).toLocaleString(
                                  "no-NO",
                                )}
                              </p>
                            )}
                          </div>
                        </div>

                        <Button
                          onClick={() => deleteApiKey(key.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="add">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">
                Legg til ny API-nøkkel
              </CardTitle>
              <CardDescription className="text-slate-400">
                Koble til din Binance-konto for automatisk trading
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Referral Box */}
              <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <ExternalLink className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">
                      Har du ikke Binance?
                    </h4>
                    <p className="text-sm text-slate-400 mb-3">
                      Registrer deg med vår referral link og få{" "}
                      <span className="text-amber-400 font-medium">
                        20% rabatt
                      </span>{" "}
                      på trading fees!
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-800 px-3 py-2 rounded text-sm text-slate-300 truncate">
                        {BINANCE_REFERRAL.link}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyReferralLink}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Label */}
                <div>
                  <label htmlFor="exchange-api-label" className="block text-sm font-medium text-slate-300 mb-2">
                    Merkelapp
                  </label>
                  <Input
                    id="exchange-api-label"
                    value={form.label}
                    onChange={(e) =>
                      setForm({ ...form, label: e.target.value })
                    }
                    placeholder="F.eks. Hovedkonto"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                {/* API Key */}
                <div>
                  <label htmlFor="exchange-api-key" className="block text-sm font-medium text-slate-300 mb-2">
                    API Key <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="exchange-api-key"
                    type="text"
                    value={form.apiKey}
                    onChange={(e) =>
                      setForm({ ...form, apiKey: e.target.value })
                    }
                    placeholder="Skriv inn din Binance API Key"
                    className={`bg-slate-800 border-slate-700 text-white font-mono text-sm ${
                      errors.apiKey ? "border-red-500" : ""
                    }`}
                  />
                  {errors.apiKey && (
                    <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.apiKey}
                    </p>
                  )}
                </div>

                {/* API Secret */}
                <div>
                  <label htmlFor="exchange-api-secret" className="block text-sm font-medium text-slate-300 mb-2">
                    API Secret <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      id="exchange-api-secret"
                      type={showSecret ? "text" : "password"}
                      value={form.apiSecret}
                      onChange={(e) =>
                        setForm({ ...form, apiSecret: e.target.value })
                      }
                      placeholder="Skriv inn din Binance API Secret"
                      className="bg-slate-800 border-slate-700 text-white font-mono text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showSecret ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Testnet Toggle */}
                <div className="flex items-center gap-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <input
                    type="checkbox"
                    id="testnet"
                    checked={form.testnet}
                    onChange={(e) =>
                      setForm({ ...form, testnet: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-600"
                  />
                  <label
                    htmlFor="testnet"
                    className="text-sm text-slate-300 cursor-pointer"
                  >
                    Bruk Binance Testnet (for testing)
                  </label>
                </div>

                {/* Messages */}
                {errors.test && (
                  <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                    <p className="text-red-400 text-sm flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>{errors.test}</span>
                    </p>
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <p className="text-green-400 text-sm flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      <span>{success}</span>
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={testCredentials}
                    disabled={
                      testing || loading || !form.apiKey || !form.apiSecret
                    }
                    variant="outline"
                    className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                        Tester...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" /> Test Tilkobling
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={saveApiKey}
                    disabled={
                      testing || loading || !form.apiKey || !form.apiSecret
                    }
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                        Lagrer...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" /> Lagre API-nøkkel
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guide">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">
                Hvordan få API-nøkler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">
                      Logg inn på Binance
                    </h4>
                    <p className="text-sm text-slate-400">
                      Gå til{" "}
                      <a
                        href="https://www.binance.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        binance.com
                      </a>{" "}
                      og logg inn på kontoen din
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">
                      Åpne API Management
                    </h4>
                    <p className="text-sm text-slate-400">
                      Gå til Profil → API Management
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">
                      Opprett ny API-nøkkel
                    </h4>
                    <p className="text-sm text-slate-400">
                      Klikk på "Create API" og gi den et navn (f.eks.
                      "Klarpakke")
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 font-bold">4</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">
                      Fullfør 2FA-verifisering
                    </h4>
                    <p className="text-sm text-slate-400">
                      Bekreft med Google Authenticator eller SMS
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 font-bold">5</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">
                      Konfigurer tillatelser
                    </h4>
                    <p className="text-sm text-slate-400">
                      Aktiver "Enable Reading" og "Enable Spot & Margin Trading"
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 font-bold">6</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Kopier nøklene</h4>
                    <p className="text-sm text-slate-400">
                      Kopier både API Key og Secret Key (vises kun én gang!)
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-400 mb-1">
                      Viktig: IP Whitelist
                    </h4>
                    <p className="text-sm text-slate-400">
                      Binance krever IP-whitelist for API-nøkler med
                      trading-tillatelser. Kontakt oss på{" "}
                      <a
                        href="mailto:post@klarpakke.no"
                        className="text-blue-400 hover:underline"
                      >
                        post@klarpakke.no
                      </a>{" "}
                      for IP-adresser.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">Sikkerhet:</span> Del aldri
                  API-nøklene dine med noen. Hold dem sikre.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
