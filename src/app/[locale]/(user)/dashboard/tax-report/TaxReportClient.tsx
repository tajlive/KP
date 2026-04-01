"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  PieChart,
  AlertCircle,
  CheckCircle,
  Info,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

interface TaxReport {
  year: number;
  totalTrades: number;
  totalBuyVolume: number;
  totalSellVolume: number;
  realizedProfitLoss: number;
  totalFees: number;
  tradesBySymbol: Record<
    string,
    {
      symbol: string;
      buyCount: number;
      sellCount: number;
      realizedProfitLoss: number;
    }
  >;
  quarterlyBreakdown: {
    q1: { profitLoss: number; trades: number };
    q2: { profitLoss: number; trades: number };
    q3: { profitLoss: number; trades: number };
    q4: { profitLoss: number; trades: number };
  };
  skatteetatenFormat: {
    year: number;
    formData: {
      post3_1_1: number;
      post3_1_2: number;
      post3_1_10: number;
    };
  };
}

export default function TaxReportClient() {
  const t = useTranslations("taxReport");
  const locale = useLocale();
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [report, setReport] = useState<TaxReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [downloading, setDownloading] = useState<"csv" | "pdf" | "html" | null>(
    null,
  );

  const availableYears = Array.from({ length: 5 }, (_, i) =>
    (new Date().getFullYear() - i).toString(),
  );

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tax-report?year=${year}`);
      if (response.status === 403) {
        setPaywall(true);
        setReport(null);
        return;
      }
      setPaywall(false);
      if (!response.ok) throw new Error("Failed to fetch report");
      const data = await response.json();
      setReport(data);
    } catch (_error) {
      toast.error(t("errorFetching"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [year]);

  const downloadFile = async (format: "csv" | "pdf" | "html") => {
    setDownloading(format);
    try {
      const response = await fetch(
        `/api/tax-report?year=${year}&format=${format}`,
      );
      if (response.status === 403) {
        toast.error(t("upgradeTitle"));
        return;
      }
      if (!response.ok) throw new Error("Failed to download");

      if (format === "pdf") {
        // Open PDF in new window for printing
        const html = await response.text();
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          toast.success(t("pdfOpenInNewWindow"));
        }
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `skatterapport-${year}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(t("downloadSuccess"));
      }
    } catch (_error) {
      toast.error(t("downloadError"));
    } finally {
      setDownloading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("no-NO", {
      style: "currency",
      currency: "NOK",
    }).format(amount);
  };

  if (paywall) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <CardTitle>{t("upgradeTitle")}</CardTitle>
          </div>
          <CardDescription className="text-base pt-2">
            {t("upgradeDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="bg-[#0052FF] hover:bg-[#0047E0]">
            <Link href={hrefWithLocale(locale, "/priser")}>
              {t("upgradeCta")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t("title")}</h1>
        <p className="text-slate-400">{t("description")}</p>
      </div>

      {/* Year Selector & Downloads */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            {t("selectYear")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder={t("selectYear")} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {availableYears.map((y) => (
                  <SelectItem
                    key={y}
                    value={y}
                    className="text-white hover:bg-slate-700"
                  >
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                onClick={() => downloadFile("csv")}
                disabled={downloading !== null || !report}
                variant="outline"
                className="border-slate-700 hover:bg-slate-800"
              >
                {downloading === "csv" ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-green-400" />
                    CSV
                  </>
                )}
              </Button>

              <Button
                onClick={() => downloadFile("html")}
                disabled={downloading !== null || !report}
                variant="outline"
                className="border-slate-700 hover:bg-slate-800"
              >
                {downloading === "html" ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2 text-orange-400" />
                    HTML
                  </>
                )}
              </Button>

              <Button
                onClick={() => downloadFile("pdf")}
                disabled={downloading !== null || !report}
                className="bg-red-600 hover:bg-red-700"
              >
                {downloading === "pdf" ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <>
                    <Printer className="w-4 h-4 mr-2" />
                    PDF
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="text-sm text-slate-500 mt-4">{t("pdfHelpText")}</p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : report ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">{t("totalTrades")}</p>
                    <p className="text-2xl font-bold text-white">
                      {report.totalTrades}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">
                      {t("realizedProfitLoss")}
                    </p>
                    <p
                      className={`text-2xl font-bold ${report.realizedProfitLoss >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {formatCurrency(report.realizedProfitLoss)}
                    </p>
                  </div>
                  {report.realizedProfitLoss >= 0 ? (
                    <TrendingUp className="w-8 h-8 text-green-400" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-red-400" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">{t("totalFees")}</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(report.totalFees)}
                    </p>
                  </div>
                  <Info className="w-8 h-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">
                      {t("taxObligation")}
                    </p>
                    <p
                      className={`text-2xl font-bold ${report.realizedProfitLoss > 0 ? "text-orange-400" : "text-green-400"}`}
                    >
                      {report.realizedProfitLoss > 0
                        ? t("taxable")
                        : t("deductible")}
                    </p>
                  </div>
                  {report.realizedProfitLoss > 0 ? (
                    <AlertCircle className="w-8 h-8 text-orange-400" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Skatteetaten Section */}
          <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <span className="text-2xl">🇳🇴</span>
                {t("skatteetatenTitle")}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {t("skatteetatenDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 p-4 rounded-lg">
                  <p className="text-slate-400 text-sm">{t("post3_1_1")}</p>
                  <p className="text-xl font-bold text-green-400">
                    {formatCurrency(
                      report.skatteetatenFormat.formData.post3_1_1,
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{t("gains")}</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg">
                  <p className="text-slate-400 text-sm">{t("post3_1_2")}</p>
                  <p className="text-xl font-bold text-red-400">
                    {formatCurrency(
                      report.skatteetatenFormat.formData.post3_1_2,
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{t("losses")}</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg">
                  <p className="text-slate-400 text-sm">{t("post3_1_10")}</p>
                  <p
                    className={`text-xl font-bold ${report.skatteetatenFormat.formData.post3_1_10 >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {formatCurrency(
                      report.skatteetatenFormat.formData.post3_1_10,
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{t("net")}</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 mt-4">
                {t("skatteetatenInfo")}
              </p>
            </CardContent>
          </Card>

          {/* Quarterly Breakdown */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <PieChart className="w-5 h-5 text-emerald-400" />
                {t("quarterlyBreakdown")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(report.quarterlyBreakdown).map(
                  ([quarter, data]) => (
                    <div
                      key={quarter}
                      className="bg-slate-800 p-4 rounded-lg text-center"
                    >
                      <p className="text-slate-400 text-sm uppercase">
                        {t(quarter)}
                      </p>
                      <p className="text-lg font-bold text-white">
                        {data.trades} {t("trades")}
                      </p>
                      <p
                        className={`text-sm ${data.profitLoss >= 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        {formatCurrency(data.profitLoss)}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>

          {/* By Symbol */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">{t("bySymbol")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-slate-700">
                      <th className="pb-3 text-slate-400 font-medium">
                        {t("symbol")}
                      </th>
                      <th className="pb-3 text-slate-400 font-medium">
                        {t("buys")}
                      </th>
                      <th className="pb-3 text-slate-400 font-medium">
                        {t("sells")}
                      </th>
                      <th className="pb-3 text-slate-400 font-medium text-right">
                        {t("profitLoss")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.tradesBySymbol).map(
                      ([symbol, data]) => (
                        <tr
                          key={symbol}
                          className="border-b border-slate-800/50"
                        >
                          <td className="py-3 text-white font-medium">
                            {symbol}
                          </td>
                          <td className="py-3 text-slate-400">
                            {data.buyCount}
                          </td>
                          <td className="py-3 text-slate-400">
                            {data.sellCount}
                          </td>
                          <td
                            className={`py-3 text-right font-medium ${data.realizedProfitLoss >= 0 ? "text-green-400" : "text-red-400"}`}
                          >
                            {formatCurrency(data.realizedProfitLoss)}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-12 text-center">
            <p className="text-slate-400">{t("noData")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
