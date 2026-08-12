"use client";

import { RiskDisclaimer } from "@/shared/disclaimers/RiskDisclaimer";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import {
  AlertTriangle,
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
  Wallet,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SupportedExchange = "kraken";

type Connection = {
  id: string;
  exchange: SupportedExchange;
  isActive: boolean;
  permissions: string[];
  lastError: string | null;
  lastValidatedAt: string | null;
};

type WalletBalance = {
  currency: string;
  balance: number;
};

type UsdtNokResponse = { rate: number };
type PricesResponse = { prices: Array<{ symbol: string; price: number }> };

type EnrichedBalance = WalletBalance & {
  valueUsdt: number | null;
  valueNok: number | null;
  priceUsdt: number | null;
};

const SUPPORTED_EXCHANGES: Array<{
  id: SupportedExchange;
  name: string;
  logo: string;
  color: string;
}> = [{ id: "kraken", name: "Kraken", logo: "K", color: "bg-emerald-500" }];

export function WalletTab() {
  const t = useTranslations("wallet");
  const nav = useTranslations("navigation");
  const locale = useLocale();

  const [selectedExchange, setSelectedExchange] =
    useState<SupportedExchange>("kraken");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [balancesByExchange, setBalancesByExchange] = useState<
    Record<string, WalletBalance[]>
  >({});
  const [usdtNokRate, setUsdtNokRate] = useState<number | null>(null);
  const [priceBySymbolUsdt, setPriceBySymbolUsdt] = useState<
    Record<string, number>
  >({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isNo = locale === "no";

  async function loadConnections() {
    const res = await fetch("/api/exchanges/connections", {
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to load connections");
    setConnections((json.connections ?? []) as Connection[]);
  }

  async function loadUsdtNokRate() {
    const res = await fetch("/api/fx/usdt-nok", { cache: "no-store" });
    const json = (await res.json()) as Partial<UsdtNokResponse> & {
      error?: string;
    };
    if (!res.ok) throw new Error(json.error ?? "Failed to load USDT/NOK rate");
    if (
      typeof json.rate !== "number" ||
      !Number.isFinite(json.rate) ||
      json.rate <= 0
    ) {
      throw new Error("Invalid USDT/NOK rate");
    }
    setUsdtNokRate(json.rate);
  }

  async function loadPrices(symbols: string[]) {
    const unique = Array.from(new Set(symbols)).filter(Boolean);
    if (unique.length === 0) return;

    const res = await fetch(
      `/api/market/binance-prices?symbols=${unique.join(",")}`,
      {
        cache: "no-store",
      },
    );
    const json = (await res.json()) as Partial<PricesResponse> & {
      error?: string;
    };
    if (!res.ok) throw new Error(json.error ?? "Failed to load prices");

    const map: { [key: string]: number } = {};
    for (const row of json.prices ?? []) {
      if (!row || typeof row.symbol !== "string") continue;
      if (
        typeof row.price !== "number" ||
        !Number.isFinite(row.price) ||
        row.price <= 0
      )
        continue;
      map[row.symbol] = row.price;
    }
    setPriceBySymbolUsdt((prev: Record<string, number>) => ({
      ...prev,
      ...map,
    }));
  }

  async function syncExchange(exchange: SupportedExchange) {
    const res = await fetch("/api/exchanges/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exchange }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error ?? "Sync failed");
    }
    setBalancesByExchange((prev) => ({
      ...prev,
      [exchange]: (json.balances ?? []) as WalletBalance[],
    }));
  }

  async function refreshAllBalances() {
    try {
      setIsRefreshing(true);
      setError(null);
      for (const conn of connections) {
        if (!conn.isActive) continue;
        await syncExchange(conn.exchange);
      }
      setMessage(isNo ? "Saldo oppdatert" : "Balances updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        await loadConnections();
        await loadUsdtNokRate();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
  }, []);

  useEffect(() => {
    if (connections.length === 0) return;
    void refreshAllBalances();
  }, [connections.length]);

  const allCurrencies = useMemo(() => {
    const set = new Set<string>();
    for (const list of Object.values(balancesByExchange)) {
      for (const row of list) set.add(row.currency);
    }
    return Array.from(set);
  }, [balancesByExchange]);

  useEffect(() => {
    const symbols = allCurrencies
      .filter((c) => c !== "USDT")
      .map((c) => `${c}USDT`);
    void (async () => {
      try {
        if (symbols.length > 0) await loadPrices(symbols);
      } catch {
        // Price failures should not block wallet balances.
      }
    })();
  }, [allCurrencies.join(",")]);

  const fmtNok = useMemo(() => {
    return new Intl.NumberFormat(isNo ? "nb-NO" : "en-US", {
      style: "currency",
      currency: "NOK",
      maximumFractionDigits: 0,
    });
  }, [isNo]);

  const totalAssets = useMemo(() => {
    return Object.values(balancesByExchange).reduce(
      (sum, list) => sum + list.length,
      0,
    );
  }, [balancesByExchange]);

  const totalUnits = useMemo(() => {
    return Object.values(balancesByExchange)
      .flat()
      .reduce((sum, row) => sum + row.balance, 0);
  }, [balancesByExchange]);

  const totalValueNok = useMemo(() => {
    if (!usdtNokRate) return null;
    let sum = 0;
    for (const list of Object.values(balancesByExchange)) {
      for (const row of list) {
        const priceUsdt =
          row.currency === "USDT"
            ? 1
            : priceBySymbolUsdt[`${row.currency}USDT`];
        if (!priceUsdt) continue;
        sum += row.balance * priceUsdt * usdtNokRate;
      }
    }
    return Number.isFinite(sum) ? sum : null;
  }, [balancesByExchange, priceBySymbolUsdt, usdtNokRate]);

  async function handleConnect() {
    if (!apiKey || !apiSecret || !selectedExchange) return;
    try {
      setIsConnecting(true);
      setError(null);
      setMessage(null);
      const payload = {
        exchange: selectedExchange,
        apiKey,
        apiSecret,
        isTestnet: false,
        permissions:
          selectedExchange === "kraken"
            ? ["balances", "trade_history"]
            : ["balances", "trade_history", "open_orders"],
      };
      const res = await fetch("/api/exchanges/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to connect");

      setApiKey("");
      setApiSecret("");
      setShowSecret(false);
      setMessage(
        isNo
          ? `${selectedExchange} koblet til og validert`
          : `${selectedExchange} connected and validated`,
      );

      await loadConnections();
      await syncExchange(selectedExchange);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDisconnect(exchange: SupportedExchange) {
    try {
      setError(null);
      const res = await fetch(
        `/api/exchanges/connections?exchange=${exchange}`,
        {
          method: "DELETE",
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to disconnect");
      setMessage(isNo ? `${exchange} frakoblet` : `${exchange} disconnected`);
      await loadConnections();
      setBalancesByExchange((prev) => {
        const clone = { ...prev };
        delete clone[exchange];
        return clone;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-emerald-500/20 bg-linear-to-br from-emerald-950/40 to-teal-950/40">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">
              {isNo ? "Tilkoblede børser" : "Connected exchanges"}
            </p>
            <h2 className="text-3xl font-bold text-white mt-1">
              {connections.length}
            </h2>
            <p className="text-slate-300 text-sm mt-2 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-300" />
              {isNo ? "Estimert totalverdi" : "Estimated total value"}:{" "}
              <span className="font-semibold">
                {totalValueNok != null ? fmtNok.format(totalValueNok) : "—"}
              </span>
            </p>
            <p className="text-slate-400 text-sm mt-2">
              {isNo ? "Assets synkronisert" : "Assets synchronized"}:{" "}
              {totalAssets}
            </p>
            <p className="text-slate-500 text-xs mt-1">
              {isNo ? "Totale enheter (råsum)" : "Total units (raw sum)"}:{" "}
              {totalUnits.toFixed(6)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-slate-700"
              onClick={refreshAllBalances}
              disabled={isRefreshing || connections.length === 0}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isNo ? "Oppdater saldo" : "Refresh balances"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-700/50 bg-slate-800/30">
        <CardHeader>
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-400" />
            {isNo ? "Koble til børs" : "Connect exchange"}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {isNo
              ? "Kraken støttes i read-only modus først (saldo + tradehistorikk)."
              : "Kraken is enabled in read-only mode first (balances + trade history)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <fieldset className="border-0 p-0 m-0">
            <legend className="block text-sm font-medium text-slate-300 mb-3">
              {t("selectExchange")}
            </legend>
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
                    className={`font-medium ${selectedExchange === exchange.id ? "text-emerald-400" : "text-white"}`}
                  >
                    {exchange.name}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="wallet-api-key"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              API Key
            </label>
            <Input
              id="wallet-api-key"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
              placeholder={isNo ? "Skriv inn API-nøkkel" : "Enter API key"}
            />
          </div>

          <div>
            <label
              htmlFor="wallet-api-secret"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              API Secret
            </label>
            <div className="relative">
              <Input
                id="wallet-api-secret"
                type={showSecret ? "text" : "password"}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 pr-10"
                placeholder={isNo ? "Skriv inn API-secret" : "Enter API secret"}
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

          <Alert className="bg-blue-950/30 border-blue-500/20">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-300/80">
              {isNo
                ? "Nøkler lagres sikkert. Secret vises aldri igjen etter lagring."
                : "Keys are stored securely. Secret is never shown again after saving."}
            </AlertDescription>
          </Alert>

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

          <Button
            onClick={handleConnect}
            disabled={
              !selectedExchange || !apiKey || !apiSecret || isConnecting
            }
            className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-12 text-lg"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                {isNo ? "Kobler til..." : "Connecting..."}
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                {isNo ? "Koble til sikkert" : "Connect securely"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert className="bg-red-950/30 border-red-500/20">
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert className="bg-emerald-950/30 border-emerald-500/20">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <AlertDescription className="text-emerald-300">
            {message}
          </AlertDescription>
        </Alert>
      )}

      {connections.length > 0 &&
        connections.map((conn) => (
          <Card key={conn.id} className="border-slate-700/50 bg-slate-800/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center font-bold text-white">
                    K
                  </div>
                  <div>
                    <CardTitle className="text-white capitalize">
                      {conn.exchange}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {conn.lastValidatedAt
                        ? `${isNo ? "Sist validert" : "Last validated"}: ${new Date(conn.lastValidatedAt).toLocaleString()}`
                        : isNo
                          ? "Ikke validert ennå"
                          : "Not validated yet"}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    {conn.permissions.join(", ")}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-700"
                    onClick={() => void syncExchange(conn.exchange)}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    {isNo ? "Synk" : "Sync"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/30 text-red-300 hover:bg-red-950/40"
                    onClick={() => void handleDisconnect(conn.exchange)}
                  >
                    {isNo ? "Koble fra" : "Disconnect"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(balancesByExchange[conn.exchange] ?? []).length === 0 ? (
                <p className="text-slate-400 text-sm">
                  {isNo
                    ? "Ingen saldo synkronisert ennå."
                    : "No balances synchronized yet."}
                </p>
              ) : (
                <div className="grid gap-2">
                  {balancesByExchange[conn.exchange]
                    .map((row): EnrichedBalance => {
                      const priceUsdt =
                        row.currency === "USDT"
                          ? 1
                          : (priceBySymbolUsdt[`${row.currency}USDT`] ?? null);
                      const valueUsdt =
                        priceUsdt != null ? row.balance * priceUsdt : null;
                      const valueNok =
                        valueUsdt != null && usdtNokRate != null
                          ? valueUsdt * usdtNokRate
                          : null;
                      return { ...row, priceUsdt, valueUsdt, valueNok };
                    })
                    .map((row) => (
                      <div
                        key={`${conn.exchange}-${row.currency}`}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700/50"
                      >
                        <div>
                          <p className="text-white font-medium">
                            {row.currency}
                          </p>
                          <p className="text-xs text-slate-500">
                            {row.priceUsdt != null
                              ? `${row.priceUsdt.toLocaleString()} USDT`
                              : isNo
                                ? "Pris utilgjengelig"
                                : "Price unavailable"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-300">
                            {row.balance.toFixed(8)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {row.valueNok != null
                              ? fmtNok.format(row.valueNok)
                              : "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              {conn.lastError && (
                <p className="text-xs text-red-300 mt-3">{conn.lastError}</p>
              )}
            </CardContent>
          </Card>
        ))}

      <RiskDisclaimer />

      <div className="text-center">
        <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>{isNo ? "Kryptert" : "Encrypted"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>{isNo ? "Sikker tilkobling" : "Secure connection"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
