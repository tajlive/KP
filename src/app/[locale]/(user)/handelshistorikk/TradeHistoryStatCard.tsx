"use client";

interface StatCardProps {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}

export function TradeHistoryStatCard({
  label,
  value,
  tone = "neutral",
}: StatCardProps) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-rose-600 dark:text-rose-400"
        : "text-slate-900 dark:text-white";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
