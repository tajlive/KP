'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Trophy } from 'lucide-react';

interface StatsData {
  active_paper_traders: number;
  avg_return_pct: number | null;
  best_return_pct: number | null;
  hasEnoughData: boolean;
}

export function LiveProofStrip() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  // Format percentage with sign
  const formatPct = (value: number | null): string => {
    if (value === null) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <section className="bg-kp-surface border-y border-kp-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-sm"
        >
          {/* Active traders */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-kp-brand" />
            <span className="text-kp-text-secondary">
              {loading || !stats ? (
                <span className="inline-block w-16 h-4 bg-kp-surface-highlight animate-pulse rounded" />
              ) : stats.hasEnoughData ? (
                <>
                  <span className="font-semibold text-kp-text-primary">
                    {stats.active_paper_traders}
                  </span>{' '}
                  aktive tradere
                </>
              ) : (
                <span className="text-kp-text-tertiary">Tidlig beta — voksende</span>
              )}
            </span>
          </div>

          {/* Average return */}
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-kp-success" />
            <span className="text-kp-text-secondary">
              {loading || !stats ? (
                <span className="inline-block w-20 h-4 bg-kp-surface-highlight animate-pulse rounded" />
              ) : stats.hasEnoughData && stats.avg_return_pct !== null ? (
                <>
                  Snitt{' '}
                  <span
                    className={`font-semibold ${
                      stats.avg_return_pct >= 0 ? 'text-kp-success' : 'text-kp-error'
                    }`}
                  >
                    {formatPct(stats.avg_return_pct)}
                  </span>
                </>
              ) : (
                <span className="text-kp-text-tertiary">Snitt —</span>
              )}
            </span>
          </div>

          {/* Best return */}
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-kp-text-secondary">
              {loading || !stats ? (
                <span className="inline-block w-20 h-4 bg-kp-surface-highlight animate-pulse rounded" />
              ) : stats.hasEnoughData && stats.best_return_pct !== null ? (
                <>
                  Beste:{' '}
                  <span className="font-semibold text-kp-success">
                    {formatPct(stats.best_return_pct)}
                  </span>{' '}
                  <span className="text-kp-text-tertiary text-xs">(siste 30d)</span>
                </>
              ) : (
                <span className="text-kp-text-tertiary">Beste —</span>
              )}
            </span>
          </div>

          {/* Disclaimer */}
          <div className="hidden md:flex items-center gap-1 text-xs text-kp-text-tertiary border-l border-kp-border pl-6">
            <span>⚠️</span>
            <span>Historiske resultater. Ingen garanti.</span>
          </div>
        </motion.div>

        {/* Mobile disclaimer */}
        <div className="md:hidden text-center mt-3 text-xs text-kp-text-tertiary">
          ⚠️ Historiske resultater. Ingen garanti for fremtidig avkastning.
        </div>
      </div>
    </section>
  );
}

export default LiveProofStrip;
