"use client";

/**
 * CreatorDashboard — analytics & management for strategy creators.
 * Shows subscriber count, revenue, publishing controls.
 */

import { motion } from "framer-motion";
import {
  BarChart3,
  Calendar,
  DollarSign,
  Eye,
  Star,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";

interface CreatorStats {
  totalSubscribers: number;
  monthlyRevenue: number;
  totalRevenue: number;
  avgRating: number;
  totalReviews: number;
  totalViews: number;
  activeStrategies: number;
}

interface CreatorStrategy {
  id: string;
  name: string;
  subscribers: number;
  revenue: number;
  rating: number;
  status: "published" | "draft" | "review";
  updatedAt: string;
}

interface CreatorDashboardProps {
  stats: CreatorStats;
  strategies: CreatorStrategy[];
  onPublishVersion: (strategyId: string) => void;
}

function formatNOK(n: number) {
  return new Intl.NumberFormat("no-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  published: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "Publisert",
  },
  draft: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    label: "Utkast",
  },
  review: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    label: "Under vurdering",
  },
};

export default function CreatorDashboard({
  stats,
  strategies,
  onPublishVersion,
}: CreatorDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 rounded-2xl">
          <BarChart3
            className="w-5 h-5 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
        </div>
        <div>
          <h2 className="text-[20px] font-bold text-gray-900 dark:text-white">
            Creator Dashboard
          </h2>
          <p className="text-[13px] text-gray-500 dark:text-gray-400">
            {stats.activeStrategies} aktive strategier
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Users}
          label="Abonnenter"
          value={stats.totalSubscribers.toLocaleString("no-NO")}
          gradient="from-blue-500 to-indigo-500"
        />
        <StatCard
          icon={DollarSign}
          label="Månedsomsetning"
          value={formatNOK(stats.monthlyRevenue)}
          gradient="from-emerald-500 to-cyan-500"
        />
        <StatCard
          icon={Star}
          label="Snittrating"
          value={`${stats.avgRating.toFixed(1)} ⭐`}
          subtitle={`${stats.totalReviews} omtaler`}
          gradient="from-amber-500 to-orange-500"
        />
        <StatCard
          icon={Eye}
          label="Visninger"
          value={stats.totalViews.toLocaleString("no-NO")}
          gradient="from-rose-500 to-pink-500"
        />
      </div>

      {/* Revenue card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/5 to-cyan-500/5
                   dark:from-emerald-500/10 dark:to-cyan-500/10
                   border border-emerald-200/50 dark:border-emerald-800/30"
      >
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span className="text-[13px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            Total inntekt
          </span>
        </div>
        <p className="text-[28px] font-bold tabular-nums bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">
          {formatNOK(stats.totalRevenue)}
        </p>
      </motion.div>

      {/* Strategies list */}
      <div>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-3 px-1">
          Mine strategier
        </h3>
        <div className="space-y-3">
          {strategies.map((strat) => {
            const statusStyle =
              STATUS_STYLES[strat.status] || STATUS_STYLES.draft;
            return (
              <div
                key={strat.id}
                className="p-4 rounded-2xl
                           bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
                           border border-gray-200/50 dark:border-gray-800/50
                           shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1">
                      {strat.name}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyle.bg} ${statusStyle.text}`}
                      >
                        {statusStyle.label}
                      </span>
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(strat.updatedAt).toLocaleDateString("no-NO")}
                      </span>
                    </div>
                  </div>
                  {strat.status === "published" && (
                    <button
                      onClick={() => onPublishVersion(strat.id)}
                      className="p-2 rounded-xl text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      aria-label={`Publiser ny versjon av ${strat.name}`}
                    >
                      <Upload className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[11px] text-gray-400">Abonnenter</p>
                    <p className="text-[15px] font-bold text-gray-900 dark:text-white tabular-nums">
                      {strat.subscribers}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400">Omsetning</p>
                    <p className="text-[15px] font-bold text-emerald-500 tabular-nums">
                      {formatNOK(strat.revenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400">Rating</p>
                    <p className="text-[15px] font-bold text-gray-900 dark:text-white">
                      {strat.rating.toFixed(1)} ⭐
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  gradient,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle?: string;
  gradient: string;
}) {
  return (
    <div
      className="p-4 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
                   border border-gray-200/50 dark:border-gray-800/50 shadow-sm"
    >
      <div
        className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient}
                      flex items-center justify-center mb-3
                      shadow-[0_2px_8px_rgba(0,0,0,0.1)]`}
      >
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-[17px] font-bold text-gray-900 dark:text-white tabular-nums">
        {value}
      </p>
      {subtitle && (
        <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}
