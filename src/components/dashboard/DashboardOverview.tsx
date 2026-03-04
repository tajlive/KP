"use client";

/**
 * DashboardOverview - Hovedoversikt for brukerens portefølje
 *
 * Viser:
 * - Total verdi
 * - Total avkastning (absolutt og prosent)
 * - Dagens endring
 * - Antall posisjoner
 *
 * Bruker norsk tekst (mobile-first, "bestemor-test")
 */

import {
  Activity,
  PieChart,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";

// =============================================================================
// Types
// =============================================================================

interface PortfolioOverviewData {
  totalValue: number;
  totalProfitAbs: number;
  totalProfitPct: number;
  dayChangeAbs: number;
  dayChangePct: number;
  totalInvested: number;
  positionCount: number;
}

interface DashboardOverviewProps {
  overview: PortfolioOverviewData | null;
  hasData: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("no-NO", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(value)
    .replace("USD", "$");
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function getTrendColor(value: number): string {
  return value >= 0 ? "text-green-600" : "text-red-600";
}

function getTrendBgColor(value: number): string {
  return value >= 0 ? "bg-green-50" : "bg-red-50";
}

// =============================================================================
// Components
// =============================================================================

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
}) {
  const trendColor =
    trend !== undefined ? getTrendColor(trend) : "text-gray-600";
  const trendBgColor =
    trend !== undefined ? getTrendBgColor(trend) : "bg-gray-50";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">
            {value}
          </p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg ${trendBgColor}`}>
          <Icon className={`w-5 h-5 ${trendColor}`} />
        </div>
      </div>

      {trend !== undefined && (
        <div className="mt-4 flex items-center gap-2">
          {trend >= 0 ? (
            <TrendingUp className="w-4 h-4 text-green-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-600" />
          )}
          <span className={`text-sm font-medium ${trendColor}`}>
            {formatPercent(trend)}
          </span>
          {trendLabel && (
            <span className="text-sm text-gray-500">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  const locale = useLocale();
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 sm:p-8 text-center">
      <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <PieChart className="w-6 h-6 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Ingen portefølje ennå
      </h3>
      <p className="text-sm text-gray-600 max-w-md mx-auto mb-4">
        Start med simulatoren for å bygge din første portefølje. Øv deg uten å
        risikere ekte penger.
      </p>
      <Link
        href={`/${locale}/beta/live-trading`}
        className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        Start simulering
      </Link>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function DashboardOverview({
  overview,
  hasData,
}: DashboardOverviewProps) {
  const locale = useLocale();
  if (!hasData || !overview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Din oversikt</h2>
        </div>
        <EmptyState />
      </div>
    );
  }

  const {
    totalValue,
    totalProfitAbs,
    totalProfitPct,
    dayChangeAbs,
    dayChangePct,
    totalInvested,
    positionCount,
  } = overview;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Din oversikt</h2>
        </div>
        <span className="text-sm text-gray-500">
          {positionCount} {positionCount === 1 ? "posisjon" : "posisjoner"}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Verdi */}
        <StatCard
          title="Total verdi"
          value={formatCurrency(totalValue)}
          subtitle={`Investert: ${formatCurrency(totalInvested)}`}
          icon={Wallet}
          trend={totalProfitPct}
          trendLabel="total avkastning"
        />

        {/* Total Avkastning */}
        <StatCard
          title="Total avkastning"
          value={formatCurrency(totalProfitAbs)}
          subtitle={`${formatPercent(totalProfitPct)} siden start`}
          icon={totalProfitAbs >= 0 ? TrendingUp : TrendingDown}
          trend={totalProfitPct}
          trendLabel="prosent"
        />

        {/* Dagens Endring */}
        <StatCard
          title="Dagens endring"
          value={formatCurrency(dayChangeAbs)}
          subtitle="Siste 24 timer"
          icon={dayChangeAbs >= 0 ? TrendingUp : TrendingDown}
          trend={dayChangePct}
          trendLabel="i dag"
        />
      </div>

      {/* Quick Actions */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/${locale}/beta/live-trading`}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ny handel
          </Link>
          <Link
            href={`/${locale}/beta/dashboard`}
            className="inline-flex items-center justify-center px-4 py-2 bg-white text-gray-700 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Se detaljer
          </Link>
        </div>
      </div>
    </div>
  );
}

export default DashboardOverview;
