"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Calculator as CalcIcon, TrendingUp, AlertTriangle, Download, Info, Coins, PiggyBank } from "lucide-react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";

// ─── Formatering ────────────────────────────────────────────

function formatNOK(n: number, locale: string): string {
  return new Intl.NumberFormat(locale === "no" ? "no-NO" : "en-US", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPercent(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

// ─── Beregning ──────────────────────────────────────────────

interface DayData {
  day: number;
  balance: number;
}

function calculateCompounding(startSum: number, dailyPercent: number, days: number): DayData[] {
  const data: DayData[] = [];
  let balance = startSum;

  for (let d = 0; d <= days; d++) {
    data.push({ day: d, balance });
    balance *= 1 + dailyPercent / 100;
  }
  return data;
}

// ─── Preset konfigurasjon ─────────────────────────────────

const PRESETS = [
  { key: "conservative", labelNo: "Forsiktig", labelEn: "Conservative", rate: 0.05, color: "bg-emerald-500" },
  { key: "moderate", labelNo: "Moderat", labelEn: "Moderate", rate: 0.1, color: "bg-teal-500" },
  { key: "aggressive", labelNo: "Aggressiv", labelEn: "Aggressive", rate: 0.5, color: "bg-amber-500" },
];

// ─── SVG Chart ──────────────────────────────────────────────

function GrowthChart({ data, startSum, monthLabels }: { data: DayData[]; startSum: number; monthLabels: string[] }) {
  const width = 600;
  const height = 200;
  const padY = 8;

  const maxBalance = data[data.length - 1]?.balance || startSum;
  const minBalance = startSum;
  const range = maxBalance - minBalance || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = padY + (height - padY * 2) - ((d.balance - minBalance) / range) * (height - padY * 2);
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L${width},${height} L0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height + 24}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0052FF" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0052FF" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#areaGrad)" />
      <path d={pathD} fill="none" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.length > 0 && (
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill="#0052FF">
          <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      {monthLabels.map((label, i) => {
        const x = (i / 12) * width;
        return (
          <text key={i} x={x} y={height + 18} textAnchor="middle" fill="#9CA3AF" fontSize="10" fontFamily="system-ui">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Hovedside ──────────────────────────────────────────────

export default function CalculatorPage() {
  const t = useTranslations("calculator");
  const locale = useLocale();
  const isNorwegian = locale === "no";
  
  const [startSum, setStartSum] = useState(10000);
  const [dailyPercent, setDailyPercent] = useState(0.1); // DEFAULT: 0.1%
  const [startSumInput, setStartSumInput] = useState("10 000");
  const [activePreset, setActivePreset] = useState("moderate");
  const [weeklySavings, setWeeklySavings] = useState(200);
  const [showWorstCase, setShowWorstCase] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  const days = 365;

  const data = useMemo(
    () => calculateCompounding(startSum, dailyPercent, days),
    [startSum, dailyPercent]
  );

  const finalBalance = data[days]?.balance || startSum;
  const totalProfit = finalBalance - startSum;
  const totalReturn = (totalProfit / startSum) * 100;
  const worstCaseBalance = startSum * 0.5; // -50% drawdown

  // Lotto comparison
  const weeks = 5 * 52; // 5 years
  const totalLottoSpent = weeklySavings * weeks;
  const lottoReturn = totalLottoSpent * 0.6; // 40% loss
  const lottoLoss = totalLottoSpent - lottoReturn;

  // Bank comparison (3% yearly)
  const weeklyRate = 0.03 / 52;
  const bankBalance = weeklySavings * ((Math.pow(1 + weeklyRate, weeks) - 1) / weeklyRate);

  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    setDailyPercent(preset.rate);
    setActivePreset(preset.key);
  };

  const handleExport = () => {
    if (resultRef.current) {
      // Simple text export
      const text = `
Kalkuleringsresultat - Klarpakke
================================
Startbeløp: ${formatNOK(startSum, locale)} kr
Daglig avkastning: ${formatPercent(dailyPercent)}%
Tid: 1 år

Resultat etter 1 år: ${formatNOK(Math.round(finalBalance), locale)} kr
Total avkastning: +${formatNOK(Math.round(totalProfit), locale)} kr (+${formatPercent(totalReturn)}%)

VIKTIG: Dette er hypotetiske beregninger. Krypto er risikabelt. Du kan tape hele investeringen.
      `.trim();
      
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "klarpakke-kalkulering.txt";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const chartLabels = ["Start", "1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "10m", "11m", "1y"];

  const handleStartSumChange = (raw: string) => {
    const cleaned = raw.replace(/[^\d]/g, "");
    const num = parseInt(cleaned) || 0;
    setStartSum(num);
    setStartSumInput(num > 0 ? formatNOK(num, locale) : "");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Disclaimer */}
      <div className="sticky top-0 z-50 bg-amber-50 border-b-2 border-amber-400">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">
                {isNorwegian ? "VIKTIG: Dette er IKKE en investeringsanbefaling" : "IMPORTANT: This is NOT investment advice"}
              </p>
              <p className="text-amber-800 text-xs mt-0.5">
                {isNorwegian 
                  ? "• Hypotetiske resultater • Krypto er ekstremt volatilt • Du kan tape hele investeringen • 0.1% daglig er ekstremt optimistisk"
                  : "• Hypothetical results • Crypto is extremely volatile • You can lose your entire investment • 0.1% daily is extremely optimistic"
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16" ref={resultRef}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-14 h-14 bg-[#0052FF]/8 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CalcIcon className="w-7 h-7 text-[#0052FF]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0A0B0D] tracking-tight mb-3">
            {isNorwegian ? "Hva kan du få for sparepengene?" : "What could you get for your savings?"}
          </h1>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">
            {isNorwegian 
              ? "Sammenlign ulike spareformer. Husk: Historisk avkastning er ingen garanti for fremtidig resultat."
              : "Compare different savings forms. Remember: Past performance is no guarantee of future results."
            }
          </p>
        </motion.div>

        {/* Preset Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <span id="kalkulator-risk-label" className="block text-sm font-medium text-[#0A0B0D] mb-3">
            {isNorwegian ? "Velg risikoprofil:" : "Choose risk profile:"}
          </span>
          <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="kalkulator-risk-label">
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => handlePresetClick(preset)}
                className={`py-3 px-2 rounded-xl text-center transition-all ${
                  activePreset === preset.key
                    ? `${preset.color} text-white shadow-lg`
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <p className="font-semibold text-sm">{isNorwegian ? preset.labelNo : preset.labelEn}</p>
                <p className={`text-xs mt-1 ${activePreset === preset.key ? "text-white/80" : "text-gray-500"}`}>
                  {formatPercent(preset.rate)}%/{isNorwegian ? "dag" : "day"}
                </p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Calculator Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {/* Inputs */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Startbeløp */}
            <div>
              <label htmlFor="startAmount" className="block text-sm font-medium text-[#0A0B0D] mb-2">
                {t("inputs.startAmount")}
              </label>
              <input
                id="startAmount"
                type="text"
                inputMode="numeric"
                value={startSumInput}
                onChange={(e) => handleStartSumChange(e.target.value)}
                onFocus={() => setStartSumInput(startSum > 0 ? String(startSum) : "")}
                onBlur={() => setStartSumInput(startSum > 0 ? formatNOK(startSum, locale) : "")}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-lg font-semibold text-[#0A0B0D] placeholder:text-gray-400 focus:outline-none focus:border-[#0052FF] focus:bg-white transition-colors tabular-nums"
                placeholder="10 000"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {[1000, 5000, 10000, 50000, 100000].map((v) => (
                  <button
                    key={v}
                    onClick={() => { setStartSum(v); setStartSumInput(formatNOK(v, locale)); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      startSum === v ? "bg-[#0052FF] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {formatNOK(v, locale)} kr
                  </button>
                ))}
              </div>
            </div>

            {/* Daglig % — slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="dailyReturn" className="text-sm font-medium text-[#0A0B0D]">
                  {isNorwegian ? "Daglig avkastning (justér selv)" : "Daily return (adjust yourself)"}
                </label>
                <span className="text-lg font-bold text-[#0052FF] tabular-nums">{formatPercent(dailyPercent)}%</span>
              </div>
              <input
                id="dailyReturn"
                type="range"
                min="0.01"
                max="2"
                step="0.01"
                value={dailyPercent}
                onChange={(e) => {
                  setDailyPercent(parseFloat(e.target.value));
                  setActivePreset("custom");
                }}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #0052FF 0%, #0052FF ${(dailyPercent / 2) * 100}%, #E5E7EB ${(dailyPercent / 2) * 100}%, #E5E7EB 100%)`,
                }}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
                <span>0,01%</span>
                <span>0,5%</span>
                <span>1%</span>
                <span>1,5%</span>
                <span>2%</span>
              </div>
            </div>

            {/* Lotte Comparison */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <label htmlFor="kalkulator-weekly-savings" className="flex items-center gap-2 text-sm font-medium text-[#0A0B0D] mb-3">
                <Coins className="w-4 h-4" />
                {isNorwegian ? "Sammenlign med Lotto-spill" : "Compare with lottery play"}
              </label>
              <div className="flex items-center gap-4 mb-3">
                <span className="text-sm text-gray-600">{isNorwegian ? "kr/uke:" : "NOK/week:"}</span>
                <input
                  id="kalkulator-weekly-savings"
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={weeklySavings}
                  onChange={(e) => setWeeklySavings(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-teal-500"
                />
                <span className="font-semibold text-teal-600 w-16 text-right">{weeklySavings} kr</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-rose-50 rounded-lg p-3 border border-rose-100">
                  <p className="text-rose-600 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    {isNorwegian ? "Lotto (tapt)" : "Lottery (lost)"}
                  </p>
                  <p className="text-rose-700 font-bold mt-1">{formatNOK(lottoLoss, locale)} kr</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                  <p className="text-emerald-600 font-medium flex items-center gap-1">
                    <PiggyBank className="w-4 h-4" />
                    {isNorwegian ? "Høyrente (3%)" : "High interest (3%)"}
                  </p>
                  <p className="text-emerald-700 font-bold mt-1">{formatNOK(Math.round(bankBalance), locale)} kr</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {isNorwegian 
                  ? "* Over 5 år. Lotto: 40% statistisk tap. Bank: Garantert, men lav avkastning."
                  : "* Over 5 years. Lottery: 40% statistical loss. Bank: Guaranteed, but low return."
                }
              </p>
            </div>

            {/* Worst Case Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowWorstCase(!showWorstCase)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showWorstCase ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {showWorstCase ? "✓" : ""} {isNorwegian ? "Vis verst tenkelig scenario (-50%)" : "Show worst case (-50%)"}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100" />

          {/* Results */}
          <div className="p-6 sm:p-8 bg-gray-50/50">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">{t("results.afterYear")}</div>
                <div className="text-xl sm:text-2xl font-bold text-[#0A0B0D] tabular-nums leading-tight">
                  {formatNOK(Math.round(showWorstCase ? worstCaseBalance : finalBalance), locale)} kr
                </div>
                {showWorstCase && (
                  <div className="text-xs text-rose-500 mt-1">{isNorwegian ? "-50% drawdown" : "-50% drawdown"}</div>
                )}
              </div>
              <div className={`rounded-xl p-4 border ${showWorstCase ? "bg-rose-50 border-rose-100" : "bg-white border-emerald-100"}`}>
                <div className="text-xs text-gray-500 mb-1">{t("results.totalReturn")}</div>
                <div className={`text-xl sm:text-2xl font-bold tabular-nums leading-tight ${showWorstCase ? "text-rose-600" : "text-emerald-600"}`}>
                  {showWorstCase ? "" : "+"}{formatNOK(Math.round(showWorstCase ? worstCaseBalance - startSum : totalProfit), locale)} kr
                </div>
                <div className={`text-xs mt-0.5 tabular-nums ${showWorstCase ? "text-rose-500" : "text-emerald-500"}`}>
                  {showWorstCase ? "-50%" : `+${formatPercent(totalReturn)}%`}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 mb-6">
              <div className="text-xs text-gray-500 mb-2 font-medium">{t("results.growthChart")}</div>
              <GrowthChart data={data} startSum={startSum} monthLabels={chartLabels} />
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 mb-6"
            >
              <Download className="w-4 h-4" />
              {isNorwegian ? "Last ned resultat (tekst)" : "Download result (text)"}
            </button>

            {/* Extended Disclaimer */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 space-y-2">
                  <p className="font-semibold">{isNorwegian ? "Viktig å forstå:" : "Important to understand:"}</p>
                  <ul className="space-y-1 text-amber-700">
                    <li>• {isNorwegian ? "Denne kalkulatoren viser hypotetiske resultater basert på sammensatt avkastning." : "This calculator shows hypothetical results based on compound returns."}</li>
                    <li>• {isNorwegian ? "Kryptomarkedet er ekstremt volatilt. Du kan tape hele investeringen." : "The crypto market is extremely volatile. You can lose your entire investment."}</li>
                    <li>• {isNorwegian ? "0.1% daglig avkastning (36% årlig) er ekstremt optimistisk og ikke realistisk over tid." : "0.1% daily return (36% yearly) is extremely optimistic and not realistic over time."}</li>
                    <li>• {isNorwegian ? "Tidligere resultater er ingen garanti for fremtidig avkastning." : "Past performance is no guarantee of future results."}</li>
                    <li>• {isNorwegian ? "Klarpakke gir ikke finansiell rådgivning. Gjør egen research." : "Klarpakke does not provide financial advice. Do your own research."}</li>
                    <li>• {isNorwegian ? "Invester kun det du har råd til å tape." : "Only invest what you can afford to lose."}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center mt-10">
          <p className="text-gray-500 text-sm mb-4">{t("cta.text")}</p>
          <Link
            href={`/${locale}/paper-trading`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0052FF] text-white font-semibold rounded-full hover:bg-[#0047E0] transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            {t("cta.button")}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
