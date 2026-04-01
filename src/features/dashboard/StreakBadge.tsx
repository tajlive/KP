"use client";

interface StreakBadgeProps {
  streak: number;
  locale: string;
}

export function StreakBadge({ streak, locale }: StreakBadgeProps) {
  const no = locale === "no";

  if (streak <= 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-[#E2E5EC] shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-4 py-3">
      <div className="text-2xl">🔥</div>
      <div>
        <p className="text-sm font-semibold text-[#1A1D26]">
          {streak} {no ? "dager på rad" : "day streak"}
        </p>
        <p className="text-xs text-[#8E95A9]">
          {streak >= 7
            ? no
              ? "Ukentlig bonus! 2x XP"
              : "Weekly bonus! 2x XP"
            : no
              ? `${7 - streak} dager til bonus`
              : `${7 - streak} days to bonus`}
        </p>
      </div>
      <div className="ml-auto flex gap-0.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full ${
              i < streak % 7 ? "bg-[#F59E0B]" : "bg-[#E2E5EC]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
