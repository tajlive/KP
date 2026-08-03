/**
 * BalanceAdjustmentBadge — vises når paper_accounts.current_balance
 * er justert nylig (beta-korreksjon).
 *
 * Logikk: Leser updated_at fra paper_accounts. Hvis innen 1 time OG
 * endring > 10%, vis badge i 24 timer.
 */
import React from "react";

interface BalanceAdjustmentBadgeProps {
  /** ISO timestamp fra paper_accounts.updated_at */
  updatedAt: string | null;
  /** Nåværende balance */
  currentBalance: number;
  /** Forrige balance (fra localStorage eller context) */
  previousBalance?: number | null;
  /** Optional: skjul badge (default false) */
  hidden?: boolean;
}

export function BalanceAdjustmentBadge({
  updatedAt,
  currentBalance,
  previousBalance,
  hidden = false,
}: BalanceAdjustmentBadgeProps) {
  if (hidden || !updatedAt) return null;

  const updated = new Date(updatedAt);
  const now = new Date();
  const hoursSinceUpdate = (now.getTime() - updated.getTime()) / (1000 * 60 * 60);

  // Vis kun hvis oppdatert innen 1 time (fersk justering)
  if (hoursSinceUpdate > 1) return null;

  // Sjekk om det var en stor endring (>10%)
  const hasBigChange =
    previousBalance != null &&
    Math.abs(currentBalance - previousBalance) / previousBalance > 0.1;

  if (!hasBigChange) return null;

  return (
    <span
      className="ml-2 text-xs text-amber-400/80 cursor-help"
      title="Beta-justering: Balansen er korrigert med riktig verdi."
    >
      [🔧 beta-justert]
    </span>
  );
}

/** Hook for å lagre forrige balance i localStorage */
export function usePreviousBalance(currentBalance: number): number | null {
  const [previous, setPrevious] = React.useState<number | null>(null);

  React.useEffect(() => {
    const stored = localStorage.getItem("kp_previous_balance");
    if (stored) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed !== currentBalance) {
        setPrevious(parsed);
      }
    }
    // Lagre ny balance etter 5 sekunder (debounce)
    const timer = setTimeout(() => {
      localStorage.setItem("kp_previous_balance", String(currentBalance));
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentBalance]);

  return previous;
}
