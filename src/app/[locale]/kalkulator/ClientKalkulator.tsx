"use client";




import { useState, useMemo } from "react"
import Link from "next/link"
import { Calculator as CalcIcon, TrendingUp, Info } from "lucide-react"
import { motion } from "framer-motion"
import { useLocale, useTranslations } from 'next-intl'

// ─── Formatering ────────────────────────────────────────────

function formatNOK(n: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'no' ? "no-NO" : "en-US", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function formatPercent(n: number): string {
  return n.toFixed(1).replace(".", ",")
}

// ─── Beregning ──────────────────────────────────────────────

interface DayData {
  day: number
  balance: number
}

function calculateCompounding(startSum: number, dailyPercent: number, days: number): DayData[] {
  const data: DayData[] = []
  let balance = startSum

  for (let d = 0; d <= days; d++) {
    data.push({ day: d, balance })
    balance *= 1 + dailyPercent / 100
  }
  return data
}

// ─── SVG Chart ──────────────────────────────────────────────

function GrowthChart({ data, startSum, monthLabels }: { data: DayData[]; startSum: number; monthLabels: string[] }) {
  const width = 600
  const height = 200
  const padY = 8

  const maxBalance = data[data.length - 1]?.balance || startSum
  const minBalance = startSum
  const range = maxBalance - minBalance || 1

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = padY + (height - padY * 2) - ((d.balance - minBalance) / range) * (height - padY * 2)
    return { x, y }
  })

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const areaD = `${pathD} L${width},${height} L0,${height} Z`

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
        const x = (i / 12) * width
        return (
          <text key={i} x={x} y={height + 18} textAnchor="middle" fill="#9CA3AF" fontSize="10" fontFamily="system-ui">
            {label}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Hovedside ──────────────────────────────────────────────

export default function CalculatorPage() {
  const t = useTranslations('calculator')
  const locale = useLocale()
  const [startSum, setStartSum] = useState(10000)
  const [dailyPercent, setDailyPercent] = useState(0.1)
  const [startSumInput, setStartSumInput] = useState("10 000")

  const days = 365

  const data = useMemo(
    () => calculateCompounding(startSum, dailyPercent, days),
    [startSum, dailyPercent]
  )

  const finalBalance = data[days]?.balance || startSum
  const totalProfit = finalBalance - startSum
  const totalReturn = (totalProfit / startSum) * 100

  // Månedlig breakdown
  const monthlyBreakdown = useMemo(() => {
    const months = []
    const _monthNames = ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Des"]
    // Note: Ideally month names should also be localized, but for now we keep hardcoded or use dates.
    // Let's use numeric or standard short names.
    // Or key them? t('months.jan')?
    // For simplicity, let's just stick to the existing ones or maybe switch to numbers if we want full i18n without extra keys.
    // Actually, let's just use English/Norwegian based on locale for now using Intl?

    for (let m = 1; m <= 12; m++) {
      const dayIndex = Math.min(Math.round(m * (365 / 12)), 365)
      const prevDayIndex = Math.round((m - 1) * (365 / 12))
      const balance = data[dayIndex]?.balance || startSum
      const prevBalance = data[prevDayIndex]?.balance || startSum

      const date = new Date(2024, m - 1, 1)
      const monthLabel = date.toLocaleString(locale === 'no' ? 'no-NO' : 'en-US', { month: 'short' })

      months.push({
        month: m,
        label: monthLabel,
        balance,
        monthProfit: balance - prevBalance,
        totalProfit: balance - startSum,
      })
    }
    return months
  }, [data, startSum, locale])

  const chartLabels = ["Start", "1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "10m", "11m", "1y"] // simplified

  const handleStartSumChange = (raw: string) => {
    const cleaned = raw.replace(/[^\d]/g, "")
    const num = parseInt(cleaned) || 0
    setStartSum(num)
    setStartSumInput(num > 0 ? formatNOK(num, locale) : "")
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-14 h-14 bg-[#0052FF]/[0.08] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CalcIcon className="w-7 h-7 text-[#0052FF]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0A0B0D] tracking-tight mb-3">
            {t('title')}
          </h1>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-blue-50 rounded-xl p-6 mb-8"
        >
          <h2 className="font-semibold text-gray-900 mb-2">{t('intro.title')}</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            {t('intro.p1')}
          </p>
          <p className="text-gray-600 text-sm leading-relaxed">
            {t('intro.p2')}
          </p>
        </motion.div>

        {/* Calculator Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {/* Inputs */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Startbeløp */}
            <div>
              <label htmlFor="startAmount" className="block text-sm font-medium text-[#0A0B0D] mb-2">
                {t('inputs.startAmount')}
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
                {[1000, 5000, 10000, 50000, 100000, 500000].map((v) => (
                  <button
                    key={v}
                    onClick={() => { setStartSum(v); setStartSumInput(formatNOK(v, locale)) }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${startSum === v ? "bg-[#0052FF] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
                  {t('inputs.dailyReturn')}
                </label>
                <span className="text-lg font-bold text-[#0052FF] tabular-nums">
                  {formatPercent(dailyPercent)}%
                </span>
              </div>
              <input
                id="dailyReturn"
                type="range"
                min="0.1"
                max="4"
                step="0.1"
                value={dailyPercent}
                onChange={(e) => setDailyPercent(parseFloat(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #0052FF 0%, #0052FF ${((dailyPercent - 0.1) / 3.9) * 100}%, #E5E7EB ${((dailyPercent - 0.1) / 3.9) * 100}%, #E5E7EB 100%)`,
                }}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
                <span>0,1%</span>
                <span>1%</span>
                <span>2%</span>
                <span>3%</span>
                <span>4%</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {[0.1, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0].map((v) => (
                  <button
                    key={v}
                    onClick={() => setDailyPercent(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${dailyPercent === v ? "bg-[#0052FF] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    {formatPercent(v)}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100" />

          {/* Results */}
          <div className="p-6 sm:p-8 bg-gray-50/50">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">{t('results.afterYear')}</div>
                <div className="text-xl sm:text-2xl font-bold text-[#0A0B0D] tabular-nums leading-tight">
                  {formatNOK(Math.round(finalBalance), locale)} kr
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-emerald-100">
                <div className="text-xs text-gray-500 mb-1">{t('results.totalReturn')}</div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-600 tabular-nums leading-tight">
                  +{formatNOK(Math.round(totalProfit), locale)} kr
                </div>
                <div className="text-xs text-emerald-500 mt-0.5 tabular-nums">
                  +{totalReturn > 99999 ? formatNOK(Math.round(totalReturn), locale) : formatNOK(Math.round(totalReturn), locale)}%
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 mb-6">
              <div className="text-xs text-gray-500 mb-2 font-medium">
                {t('results.growthChart')}
              </div>
              <GrowthChart data={data} startSum={startSum} monthLabels={chartLabels} />
            </div>

            {/* Monthly breakdown */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-[#0A0B0D]">
                  {t('results.monthly')}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400">
                      <th className="text-left py-2.5 px-4 font-medium">{t('table.month')}</th>
                      <th className="text-right py-2.5 px-4 font-medium">{t('table.balance')}</th>
                      <th className="text-right py-2.5 px-4 font-medium">{t('table.monthProfit')}</th>
                      <th className="text-right py-2.5 px-4 font-medium">{t('table.totalProfit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyBreakdown.map((m) => (
                      <tr key={m.month} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 px-4 text-[#0A0B0D] font-medium">{m.label}</td>
                        <td className="py-2.5 px-4 text-right text-[#0A0B0D] tabular-nums">{formatNOK(Math.round(m.balance), locale)} kr</td>
                        <td className="py-2.5 px-4 text-right text-emerald-600 tabular-nums">+{formatNOK(Math.round(m.monthProfit), locale)} kr</td>
                        <td className="py-2.5 px-4 text-right text-emerald-600 tabular-nums">+{formatNOK(Math.round(m.totalProfit), locale)} kr</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-6 flex items-start gap-2.5 p-4 bg-amber-50 border border-amber-200/60 rounded-xl">
              <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 mb-1">{t('disclaimer.title')}</p>
                <p className="text-sm text-amber-700 leading-relaxed">
                  {t('disclaimer.text')}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center mt-10">
          <p className="text-gray-500 text-sm mb-4">
            {t('cta.text')}
          </p>
          <Link
            href={`/${locale}/paper-trading`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0052FF] text-white font-semibold rounded-full hover:bg-[#0047E0] transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            {t('cta.button')}
          </Link>
        </motion.div>
      </div>
    </div>
  )
}

