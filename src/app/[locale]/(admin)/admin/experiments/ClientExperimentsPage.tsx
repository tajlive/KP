"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/utils";
import { getExperimentStats, getAllExperiments } from "@/lib/ab-testing";
import type { ExperimentStats } from "@/lib/ab-testing";
import {
  BarChart3,
  FlaskConical,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";

type ExperimentData = ExperimentStats & {
  description: string;
};

const EXPERIMENT_INFO: Record<string, { label: string; description: string }> =
  {
    landing_hero_2026: {
      label: "Landing page — Hero heading",
      description:
        'Variant A: "Lær krypto trading — uten å risikere en krone"\n' +
        'Variant B: "Norges første krypto-skole — start med 100 000 kr i dag"\n' +
        "Mål: CTA-klikk → signup",
    },
  };

function formatPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function ExperimentCard({
  exp,
}: {
  exp: ExperimentData;
}) {
  const info = EXPERIMENT_INFO[exp.name] ?? {
    label: exp.name,
    description: "Ingen beskrivelse",
  };
  const isWinning = exp.bRate > exp.aRate && exp.significant;
  const isLosing = exp.bRate < exp.aRate && exp.significant;

  return (
    <div className="bg-[#1A1D26] border border-[#2A2D35] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-[#2A2D35] bg-[#15171B]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#F9FAFB] truncate">
              {info.label}
            </h2>
            <p className="text-sm text-[#6B7280] mt-1 whitespace-pre-line">
              {info.description}
            </p>
          </div>
          <span className="shrink-0 px-3 py-1 bg-[#064E3B] border border-[#10B981]/30 text-[#10B981] rounded-full text-xs font-semibold">
            Aktiv
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#15171B] rounded-xl p-4">
            <p className="text-[#6B7280] text-xs font-medium mb-1">
              Totalt besøk
            </p>
            <p className="text-2xl font-black text-[#F9FAFB] tabular-nums">
              {exp.totalImpressions}
            </p>
          </div>
          <div className="bg-[#15171B] rounded-xl p-4">
            <p className="text-[#6B7280] text-xs font-medium mb-1">
              Konverteringer
            </p>
            <p className="text-2xl font-black text-[#F9FAFB] tabular-nums">
              {exp.totalConversions}
            </p>
          </div>
          <div className="bg-[#15171B] rounded-xl p-4">
            <p className="text-[#6B7280] text-xs font-medium mb-1">
              Overall CVR
            </p>
            <p className="text-2xl font-black text-[#F59E0B] tabular-nums">
              {exp.totalImpressions > 0
                ? ((exp.totalConversions / exp.totalImpressions) * 100).toFixed(
                    2,
                  )
                : "0.00"}
              %
            </p>
          </div>
          <div className="bg-[#15171B] rounded-xl p-4">
            <p className="text-[#6B7280] text-xs font-medium mb-1">
              P-verdi
            </p>
            <p
              className={`text-2xl font-black tabular-nums ${
                exp.significant ? "text-[#10B981]" : "text-[#9CA3AF]"
              }`}
            >
              {exp.pValue < 0.001
                ? "<0.001"
                : exp.pValue.toFixed(4)}
            </p>
          </div>
        </div>

        {/* Variant Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Variant A (Control) */}
          <div
            className={`rounded-xl p-5 ${
              isLosing
                ? "bg-[#7F1D1D]/20 border-2 border-[#EF4444]/30"
                : "bg-[#15171B] border border-[#2A2D35]"
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-[#6B7280]" />
              <h3 className="font-bold text-[#F9FAFB]">Variant A</h3>
              <span className="text-xs text-[#6B7280]">(Control)</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#9CA3AF]">Heading:</span>
                <span className="text-sm text-[#F9FAFB] font-medium text-right max-w-[200px]">
                  Lær krypto trading — uten å risikere en krone
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#9CA3AF]">Visninger</span>
                <span className="font-semibold text-[#F9FAFB] tabular-nums">
                  {exp.a.impressions}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#9CA3AF]">Konverteringer</span>
                <span className="font-semibold text-[#F9FAFB] tabular-nums">
                  {exp.a.conversions}
                </span>
              </div>
              <div className="pt-3 border-t border-[#2A2D35]">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#9CA3AF]">
                    Conversion Rate
                  </span>
                  <span className="text-xl font-black text-[#F9FAFB] tabular-nums">
                    {formatPct(exp.aRate)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Variant B (Treatment) */}
          <div
            className={`rounded-xl p-5 ${
              isWinning
                ? "bg-[#064E3B]/20 border-2 border-[#10B981]/40"
                : "bg-[#15171B] border border-[#2A2D35]"
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-[#10B981]" />
              <h3 className="font-bold text-[#F9FAFB]">Variant B</h3>
              <span className="text-xs text-[#6B7280]">(Treatment)</span>
              {isWinning && (
                <span className="ml-auto px-2 py-0.5 bg-[#064E3B] text-[#10B981] text-[10px] font-bold rounded">
                  🏆 VINNER
                </span>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#9CA3AF]">Heading:</span>
                <span className="text-sm text-[#F9FAFB] font-medium text-right max-w-[200px]">
                  Norges første krypto-skole — start med 100 000 kr i dag
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#9CA3AF]">Visninger</span>
                <span className="font-semibold text-[#F9FAFB] tabular-nums">
                  {exp.b.impressions}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#9CA3AF]">Konverteringer</span>
                <span className="font-semibold text-[#F9FAFB] tabular-nums">
                  {exp.b.conversions}
                </span>
              </div>
              <div className="pt-3 border-t border-[#2A2D35]">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#9CA3AF]">
                    Conversion Rate
                  </span>
                  <div className="text-right">
                    <span
                      className={`text-xl font-black tabular-nums ${
                        isWinning
                          ? "text-[#10B981]"
                          : isLosing
                            ? "text-[#EF4444]"
                            : "text-[#F9FAFB]"
                      }`}
                    >
                      {formatPct(exp.bRate)}
                    </span>
                    {exp.bRate !== exp.aRate && (
                      <p
                        className={`text-xs font-bold ${
                          exp.bRate > exp.aRate
                            ? "text-[#10B981]"
                            : "text-[#EF4444]"
                        }`}
                      >
                        {exp.bRate > exp.aRate ? "+" : ""}
                        {(
                          ((exp.bRate - exp.aRate) / (exp.aRate || 0.001)) *
                          100
                        ).toFixed(1)}
                        % vs control
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Significance */}
        <div
          className={`rounded-xl p-4 ${
            exp.significant
              ? "bg-[#064E3B]/20 border border-[#10B981]/30"
              : "bg-[#15171B] border border-[#2A2D35]"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`shrink-0 w-2 h-2 mt-1.5 rounded-full ${
                exp.significant ? "bg-[#10B981]" : "bg-[#6B7280]"
              }`}
            />
            <div>
              <p className="font-semibold text-[#F9FAFB] text-sm">
                {exp.significant
                  ? "Statistisk signifikant"
                  : "Ikke statistisk signifikant ennå"}
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1">
                χ² = {exp.chiSquared.toFixed(2)}
                {exp.significant
                  ? " — p < 0.05, forkaster nullhypotesen"
                  : ` — p = ${exp.pValue.toFixed(4)} (krever p < 0.05)`}
                .{" "}
                {exp.totalImpressions < 100
                  ? "Fortsett å samle data — få besøk så langt."
                  : ""}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientExperimentsPage() {
  const [experiments, setExperiments] = useState<ExperimentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const supabase = createClient();
      const names = await getAllExperiments(
        supabase as Parameters<typeof getAllExperiments>[0],
      );

      if (names.length === 0) {
        // Hvis ingen data ennå, vis det planlagte eksperimentet
        const stats = await getExperimentStats(
          "landing_hero_2026",
          supabase as Parameters<typeof getExperimentStats>[1],
        );
        setExperiments([{ ...stats, description: "" }]);
      } else {
        const allStats = await Promise.all(
          names.map(async (name) => {
            const stats = await getExperimentStats(
              name,
              supabase as Parameters<typeof getExperimentStats>[1],
            );
            return { ...stats, description: "" };
          }),
        );
        setExperiments(allStats);
      }
    } catch {
      // Vis default state på feil
      setExperiments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#9CA3AF]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Laster eksperimentdata...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#F9FAFB] flex items-center gap-3">
            <FlaskConical className="w-7 h-7 text-[#3B82F6]" />
            A/B-eksperimenter
          </h1>
          <p className="text-[#9CA3AF] mt-1 text-sm">
            Overvåk konverteringsrater og statistisk signifikans
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1A1D26] border border-[#2A2D35] 
            rounded-xl text-sm font-medium text-[#F9FAFB] hover:bg-[#2A2D35] transition-colors
            min-h-[44px] disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Oppdaterer..." : "Oppdater"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1A1D26] border border-[#2A2D35] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-[#3B82F6]" />
            </div>
          </div>
          <p className="text-[#6B7280] text-xs font-medium">Aktive tester</p>
          <p className="text-2xl font-black text-[#F9FAFB]">
            {experiments.length}
          </p>
        </div>
        <div className="bg-[#1A1D26] border border-[#2A2D35] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#10B981]" />
            </div>
          </div>
          <p className="text-[#6B7280] text-xs font-medium">Totalt besøk</p>
          <p className="text-2xl font-black text-[#F9FAFB]">
            {experiments.reduce((s, e) => s + e.totalImpressions, 0)}
          </p>
        </div>
        <div className="bg-[#1A1D26] border border-[#2A2D35] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#F59E0B]" />
            </div>
          </div>
          <p className="text-[#6B7280] text-xs font-medium">Signifikante</p>
          <p className="text-2xl font-black text-[#F9FAFB]">
            {experiments.filter((e) => e.significant).length}
          </p>
        </div>
      </div>

      {/* Experiment Cards */}
      {experiments.length === 0 ? (
        <div className="text-center py-16 bg-[#1A1D26] border border-[#2A2D35] rounded-2xl">
          <FlaskConical className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#F9FAFB] mb-2">
            Ingen data ennå
          </h3>
          <p className="text-sm text-[#6B7280] max-w-md mx-auto">
            Når besøkende lander på forsiden og blir tildelt en variant, vil
            resultatene vises her. Data samles automatisk fra landing page.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {experiments.map((exp) => (
            <ExperimentCard key={exp.name} exp={exp} />
          ))}
        </div>
      )}
    </div>
  );
}
