'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Trophy, Info } from 'lucide-react';

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

  const formatPct = (value: number | null): string => {
    if (value === null) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <section className="bg-kp-surface border-y border-kp-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-sm"
        >
          {/* Paper-trading indicator — subtle, not screaming */}
          <div className="flex items-center gap-1.5 text-xs text-amber-400/70" title="Papirhandel = simulert. Ingen ekte penger.">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/50" />
            <span>Papirhandel</span>
            <Info className="w-3 h-3" />
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-4 bg-kp-border" />

          {/* Average return */}
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-kp-success" />
            <span className="text-kp-text-secondary">
              {loading || !stats ? (
                <span className="inline-block w-16 h-3 bg-kp-surface-highlight animate-pulse rounded" />
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
                <span className="inline-block w-16 h-3 bg-kp-surface-highlight animate-pulse rounded" />
              ) : stats.hasEnoughData && stats.best_return_pct !== null ? (
                <>
                  Beste:{' '}
                  <span className="font-semibold text-kp-success">
                    {formatPct(stats.best_return_pct)}
                  </span>
                </>
              ) : (
                <span className="text-kp-text-tertiary">Beste —</span>
              )}
            </span>
          </div>

          {/* Subtle disclaimer */}
          <div className="hidden md:flex items-center gap-1 text-xs text-kp-text-tertiary/50 border-l border-kp-border pl-4">
            <span>Historiske resultater. Ingen garanti.</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default LiveProofStrip;
