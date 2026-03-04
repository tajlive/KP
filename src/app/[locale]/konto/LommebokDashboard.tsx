"use client";

import { RiskDisclaimer } from "@/components/RiskDisclaimer";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  Key,
  Landmark,
  Lock,
  RefreshCw,
  Shield,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

interface Exchange {
  id: string;
  name: string;
  logo: string;
  connected: boolean;
  balance?: number;
  currencies?: { symbol: string; amount: number; valueNok: number }[];
}

const SUPPORTED_EXCHANGES = [
  { id: "binance", name: "Binance", logo: "B", color: "bg-yellow-500" },
  { id: "coinbase", name: "Coinbase", logo: "C", color: "bg-blue-500" },
  { id: "kraken", name: "Kraken", logo: "K", color: "bg-emerald-500" },
  { id: "firi", name: "Firi", logo: "F", color: "bg-green-500" },
];

// Binance Referral Pro link
const BINANCE_REF_LINK = "https://accounts.binance.com/register?ref=43427892";

export function LommebokDashboard() {
  const t = useTranslations("wallet");
  const nav = useTranslations("navigation");
  const locale = useLocale();
  const [selectedExchange, setSelectedExchange] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);

  const handleConnect = async () => {
    if (!apiKey || !apiSecret || !selectedExchange) return;

    setIsConnecting(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const mockExchange: Exchange = {
      id: selectedExchange,
      name:
        SUPPORTED_EXCHANGES.find((e) => e.id === selectedExchange)?.name || "",
      logo:
        SUPPORTED_EXCHANGES.find((e) => e.id === selectedExchange)?.logo || "",
      connected: true,
      balance: 154320.5,
      currencies: [
        { symbol: "BTC", amount: 0.045, valueNok: 125000 },
        { symbol: "ETH", amount: 1.2, valueNok: 25000 },
        { symbol: "USDT", amount: 4320.5, valueNok: 4320.5 },
      ],
    };

    setExchanges([mockExchange]);
    setConnected(true);
    setIsConnecting(false);

    localStorage.setItem("connected_exchange", JSON.stringify(mockExchange));
  };

  const totalBalance = exchanges.reduce(
    (sum, ex) => sum + (ex.balance || 0),
    0,
  );
  const currencyLocale =
    locale === "no" ? "nb-NO" : locale === "th" ? "th-TH" : "en-US";
  const currencyCode =
    locale === "no" ? "NOK" : locale === "th" ? "THB" : "USD";

  // Hvis tilkoblet, vis oversikt
  if (connected && exchanges.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* Header */}
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center">
                <Landmark className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{t("title")}</h2>
                <p className="text-xs text-slate-400">{t("subtitle")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                {t("connected")}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400"
                asChild
              >
                <Link href={`/${locale}`}>{nav("home")}</Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Total Balance */}
          <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-950/50 to-teal-950/50">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">
                    {t("balances.total")}
                  </p>
                  <h2 className="text-4xl font-bold text-white">
                    {totalBalance.toLocaleString(currencyLocale, {
                      style: "currency",
                      currency: currencyCode,
                    })}
                  </h2>
                  <p className="text-emerald-400 text-sm mt-2 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    +2.4% {locale === "no" ? "siste 24t" : "last 24h"}
                  </p>
                </div>
                <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Binance CTA for flere børser */}
          <Card className="border-yellow-500/20 bg-yellow-950/20">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center font-bold text-white text-xl">
                    B
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      {locale === "no"
                        ? "Har du ikke Binance-konto?"
                        : "Don't have a Binance account?"}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      {locale === "no"
                        ? "Opprett via vår lenke og få lavere gebyrer"
                        : "Create via our link and get lower fees"}
                    </p>
                  </div>
                </div>
                <Button
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                  asChild
                >
                  <a
                    href={BINANCE_REF_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {locale === "no"
                      ? "Opprett Binance-konto"
                      : "Create Binance Account"}
                  </a>
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-4">
                {t("security.commission")}
              </p>
            </CardContent>
          </Card>

          {/* Tilkoblet børs */}
          {exchanges.map((exchange) => (
            <Card
              key={exchange.id}
              className="border-slate-700/50 bg-slate-800/30"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center font-bold text-white text-xl">
                      {exchange.logo}
                    </div>
                    <div>
                      <CardTitle className="text-white">
                        {exchange.name}
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        {t("connected")} • {t("updatedNow")}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      {exchange.balance?.toLocaleString(currencyLocale, {
                        style: "currency",
                        currency: currencyCode,
                      })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {exchange.currencies?.map((currency) => (
                    <div
                      key={currency.symbol}
                      className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-700/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center font-bold text-white">
                          {currency.symbol[0]}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {currency.symbol}
                          </p>
                          <p className="text-slate-400 text-sm">
                            {currency.amount} {currency.symbol}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">
                          {currency.valueNok.toLocaleString(currencyLocale, {
                            style: "currency",
                            currency: currencyCode,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Risk Disclaimer */}
          <RiskDisclaimer />
        </main>
      </div>
    );
  }

  // Vis tilkoblingsskjema
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl mb-6 shadow-2xl shadow-emerald-500/20">
            <Landmark className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{t("title")}</h1>
          <p className="text-slate-400">{t("subtitle")}</p>
        </div>

        {/* Anbefalt for nybegynnere: Binance */}
        <Card className="border-yellow-500/20 bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center font-bold text-black">
                B
              </div>
              {locale === "no"
                ? "Anbefalt for nybegynnere: Binance"
                : "Recommended for beginners: Binance"}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t("exchangeHelp")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold h-12 text-lg"
              asChild
            >
              <a
                href={BINANCE_REF_LINK}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                {locale === "no"
                  ? "Opprett Binance-konto"
                  : "Create Binance Account"}
              </a>
            </Button>
            <p className="text-xs text-slate-500 text-center">
              {t("security.commission")}
            </p>
            <div className="flex justify-center">
              <Link
                href={`/${locale}/binance-guide`}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                {locale === "no"
                  ? "Les vår Binance-guide"
                  : "Read our Binance Guide"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Hovedkort: Koble til eksisterende konto */}
        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-xl flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-400" />
              {locale === "no"
                ? "Koble til din lommebok"
                : "Connect your wallet"}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {locale === "no"
                ? "Har du allerede en børskonto? Koble til for å se din beholdning her."
                : "Already have an exchange account? Connect to see your balance here."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Velg børs */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                {t("selectExchange")}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {SUPPORTED_EXCHANGES.map((exchange) => (
                  <button
                    key={exchange.id}
                    onClick={() => setSelectedExchange(exchange.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                      selectedExchange === exchange.id
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 ${exchange.color} rounded-lg flex items-center justify-center font-bold text-white`}
                    >
                      {exchange.logo}
                    </div>
                    <span
                      className={`font-medium ${
                        selectedExchange === exchange.id
                          ? "text-emerald-400"
                          : "text-white"
                      }`}
                    >
                      {exchange.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                API Key
              </label>
              <Input
                type="text"
                placeholder={
                  locale === "no" ? "Skriv inn API-nøkkel" : "Enter API key"
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            {/* API Secret */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                API Secret
              </label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  placeholder={
                    locale === "no"
                      ? "Skriv inn API-secret"
                      : "Enter API secret"
                  }
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 pr-10"
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

            {/* Info om read-only */}
            <Alert className="bg-blue-950/30 border-blue-500/20">
              <Info className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300/80">
                <span
                  dangerouslySetInnerHTML={{
                    __html: t("security.readOnly")
                      .replace(/<strong>/g, "<strong>")
                      .replace(/<\/strong>/g, "</strong>"),
                  }}
                />
              </AlertDescription>
            </Alert>

            {/* Advarsel */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-amber-400 font-medium text-sm">
                    {t("security.title")}
                  </p>
                  <p className="text-amber-300/80 text-sm mt-1">
                    {t("security.warning")}
                  </p>
                </div>
              </div>
            </div>

            {/* Koble til knapp */}
            <Button
              onClick={handleConnect}
              disabled={
                !selectedExchange || !apiKey || !apiSecret || isConnecting
              }
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-12 text-lg"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  {locale === "no" ? "Kobler til..." : "Connecting..."}
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  {locale === "no" ? "Koble til sikkert" : "Connect securely"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Risk Disclaimer nederst */}
        <RiskDisclaimer />

        {/* Footer */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>256-bit encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>
                {locale === "no" ? "Sikker tilkobling" : "Secure connection"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
