/**
 * Continuous Learner — Daglig læring og optimalisering.
 *
 * Analyserer ALLE feil på tvers av ALLE brukere,
 * finner mønstre, og oppdaterer globale strategi-parametere.
 *
 * Kjøres som cron-jobb hver dag kl. 06:00.
 */

import { classifyMistake, autoHeal, type MistakeCategory, type HealingAction } from "./auto-healer";

export interface LearningReport {
  date: Date;
  totalMistakes: number;
  topCategories: Array<{ category: MistakeCategory; count: number }>;
  healingsApplied: HealingAction[];
  improvedAgents: string[];
  warnings: string[];
}

/** Hovedfunksjon — kjøres daglig */
export async function dailyLearningCycle(): Promise<LearningReport> {
  // I produksjon: hent fra Supabase
  // For now: return baseline
  return {
    date: new Date(),
    totalMistakes: 0,
    topCategories: [],
    healingsApplied: [],
    improvedAgents: [],
    warnings: [],
  };
}

/** Finn mønstre i feil (minst N like feil på rad) */
export function findPatterns(
  mistakesByAgent: Map<string, TradeMistake[]>,
  minOccurrences = 3
): Map<string, MistakeCategory[]> {
  const patterns = new Map<string, MistakeCategory[]>();

  for (const [agentId, mistakes] of mistakesByAgent) {
    const categoryCounts = new Map<MistakeCategory, number>();
    for (const m of mistakes) {
      categoryCounts.set(m.category, (categoryCounts.get(m.category) ?? 0) + 1);
    }

    const significant: MistakeCategory[] = [];
    for (const [cat, count] of categoryCounts) {
      if (count >= minOccurrences) significant.push(cat);
    }

    if (significant.length > 0) {
      patterns.set(agentId, significant);
    }
  }

  return patterns;
}

/** Generer daglig læringsrapport */
export function formatLearningReport(report: LearningReport): string {
  const lines: string[] = [
    "📊 CryptoPilot Daily Learning Report",
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🩺 ${report.totalMistakes} feil analysert, ${report.healingsApplied.length} helbredelser utført`,
    "",
  ];

  if (report.topCategories.length > 0) {
    lines.push("🔝 Topp feil:");
    for (const { category, count } of report.topCategories) {
      lines.push(`  ${report.topCategories.indexOf({ category, count }) + 1}. ${formatCategory(category)} (${count} trades)`);
    }
    lines.push("");
  }

  if (report.improvedAgents.length > 0) {
    lines.push("📈 Forbedrede agenter:");
    for (const agent of report.improvedAgents) {
      lines.push(`  • ${agent}`);
    }
    lines.push("");
  }

  if (report.warnings.length > 0) {
    lines.push("⚠️  Advarsler:");
    for (const warning of report.warnings) {
      lines.push(`  • ${warning}`);
    }
  }

  return lines.join("\n");
}

function formatCategory(cat: MistakeCategory): string {
  const names: Record<MistakeCategory, string> = {
    entry_too_early: "Entry for tidlig",
    entry_too_late: "Entry for sent",
    exit_too_early: "Exit for tidlig",
    exit_too_late: "Exit for sent",
    stop_loss_too_tight: "Stop-loss for trang",
    stop_loss_too_wide: "Stop-loss for bred",
    position_too_large: "Posisjon for stor",
    position_too_small: "Posisjon for liten",
    wrong_regime: "Feil regime",
    signal_false_positive: "Falskt positivt signal",
  };
  return names[cat] ?? cat;
}

// Re-export types
export type { TradeMistake, MistakeCategory } from "./auto-healer";
import type { TradeMistake } from "./auto-healer";
