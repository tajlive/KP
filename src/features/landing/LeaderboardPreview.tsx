"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Trophy, TrendingUp, Coins, ArrowRight, UserPlus } from "lucide-react";
import { BRAND, SURFACE, RADIUS } from "@/lib/design/tokens";
import { LeaderboardEntry } from "@/lib/leaderboard/preview";

interface LeaderboardPreviewProps {
  entries?: LeaderboardEntry[];
}

/**
 * Podium card colors for top 3
 */
const PODIUM_STYLES = {
  1: {
    rank: "bg-gradient-to-br from-yellow-400 to-amber-500",
    border: "border-yellow-500/30",
    glow: "shadow-yellow-500/20",
    icon: "text-yellow-400",
    label: "Gull",
  },
  2: {
    rank: "bg-gradient-to-br from-slate-300 to-slate-400",
    border: "border-slate-400/30",
    glow: "shadow-slate-400/20",
    icon: "text-slate-400",
    label: "Sølv",
  },
  3: {
    rank: "bg-gradient-to-br from-amber-600 to-amber-700",
    border: "border-amber-600/30",
    glow: "shadow-amber-600/20",
    icon: "text-amber-600",
    label: "Bronse",
  },
} as const;

function PodiumCard({
  entry,
  index,
}: {
  entry: LeaderboardEntry;
  index: number;
}) {
  const styles = PODIUM_STYLES[entry.rank as keyof typeof PODIUM_STYLES];
  const isFirst = entry.rank === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        type: "spring",
        stiffness: 50,
        damping: 20,
        delay: index * 0.15,
      }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`
        relative overflow-hidden
        ${SURFACE.glass.medium}
        ${RADIUS.card}
        ${isFirst ? "ring-2 ring-yellow-500/20" : ""}
        shadow-lg ${styles.glow}
        transition-all duration-500
        group
      `}
    >
      {/* Rank badge */}
      <div
        className={`
          absolute -top-3 left-1/2 -translate-x-1/2
          w-10 h-10 rounded-full ${styles.rank}
          flex items-center justify-center
          shadow-lg font-black text-slate-900 text-lg
          z-10
        `}
      >
        {entry.rank}
      </div>

      {/* Content */}
      <div className="pt-10 pb-6 px-6 text-center">
        {/* Trophy icon for #1 */}
        {isFirst && (
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, type: "spring" }}
            className="mb-4 flex justify-center"
          >
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-yellow-400" />
            </div>
          </motion.div>
        )}

        {/* Username */}
        <h3 className="text-xl font-bold text-white mb-1">{entry.username}</h3>
        <p className="text-sm text-kp-text-muted mb-6">{styles.label}</p>

        {/* Stats */}
        <div className="space-y-3">
          {/* Return % */}
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-2xl font-black text-emerald-400">
              +{entry.return.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-kp-text-muted uppercase tracking-wider">
            Avkastning
          </p>

          {/* Divider */}
          <div className="w-16 h-px bg-white/10 mx-auto" />

          {/* KLT */}
          <div className="flex items-center justify-center gap-2">
            <Coins className="w-4 h-4 text-brand-400" />
            <span className="text-lg font-bold text-white">
              {entry.klt.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-kp-text-muted uppercase tracking-wider">
            KLT
          </p>
        </div>
      </div>

      {/* Hover gradient overlay */}
      <div
        className={`
          absolute inset-0 opacity-0 group-hover:opacity-100
          transition-opacity duration-500 pointer-events-none
          bg-gradient-to-t from-brand-500/5 to-transparent
        `}
      />
    </motion.div>
  );
}

export function LeaderboardPreview({ entries }: LeaderboardPreviewProps) {
  const locale = useLocale();
  const t = useTranslations("landing.leaderboard");

  // Default mock data if no entries provided
  const defaultEntries: LeaderboardEntry[] = [
    { rank: 1, username: "Trader***", return: 45.2, klt: 50000 },
    { rank: 2, username: "Crypto**", return: 38.7, klt: 30000 },
    { rank: 3, username: "Hodl****", return: 32.1, klt: 20000 },
  ];

  const displayEntries = entries || defaultEntries;

  return (
    <section className="py-20 bg-[#050510] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-kp-text-secondary">
              {t("badge")}
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            {t("title")}
          </h2>
          <p className="text-xl text-kp-text-secondary max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </motion.div>

        {/* Podium cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          {displayEntries.map((entry, index) => (
            <PodiumCard key={entry.rank} entry={entry} index={index} />
          ))}
        </div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href={`/${locale}/konkurranse`}
            className={`
              inline-flex items-center gap-2 px-8 py-4
              ${BRAND.gradient} text-white
              ${RADIUS.button} font-bold
              shadow-lg shadow-brand-500/25
              hover:shadow-brand-500/40 hover:scale-[1.02]
              transition-all duration-200
            `}
          >
            {t("ctaPrimary")}
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link
            href={`/${locale}/register`}
            className={`
              inline-flex items-center gap-2 px-8 py-4
              bg-white/5 text-white border border-white/10
              ${RADIUS.button} font-semibold
              hover:bg-white/10 hover:border-white/20
              transition-all duration-200
            `}
          >
            <UserPlus className="w-5 h-5" />
            {t("ctaSecondary")}
          </Link>
        </motion.div>

        {/* Trust note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7 }}
          className="text-center text-sm text-kp-text-muted mt-8"
        >
          {t("trustNote")}
        </motion.p>
      </div>
    </section>
  );
}
