/**
 * Kanonisk limits-resolver for trading-risiko.
 *
 * Sentraliserer hvordan grenser resolves for paper vs live, slik at
 * risk-validator kan være modus-agnostisk. Modusspesifikke forskjeller
 * begrenses til denne filen.
 */

import {
  PAPER_DEMO_DEFAULT_MAX_DAILY_LOSS_PCT,
  PAPER_DEMO_DEFAULT_MAX_EXPOSURE_PCT,
  PAPER_DEMO_DEFAULT_MAX_POSITION_PCT,
} from "@/lib/trading/paper-demo-risk-defaults";
import { PAPER_TRADING_UI_SYMBOLS } from "@/lib/trading/paper-ui-symbols";
import { getAllowedPairs, type TradingMode } from "@/lib/trading/canonical/symbols/registry";

export interface ResolvedRiskLimits {
  maxPositionPct: number;
  maxExposurePct: number;
  maxDailyLossPct: number;
  allowedPairs: string[];
  leverageAllowed: boolean;
  profileId?: string;
  profileName?: string;
}

export interface RawRiskProfile {
  id: string;
  name: string;
  max_position_pct: number | null;
  max_exposure_pct: number | null;
  max_daily_loss_pct: number | null;
  allowed_pairs: string[] | null;
  leverage_allowed: boolean | null;
}

/**
 * Resolver risikogrenser basert på modus og optional DB-profil.
 *
 * - Paper uten profil: demo-defaults med kanonisk symbol-univers.
 * - Paper med profil: profilens grenser, union med kanonisk univers for UX.
 * - Live uten profil: returnerer undefined (live krever eksplisitt profil).
 * - Live med profil: profilens grenser.
 */
export function resolveRiskLimits(
  mode: TradingMode,
  profile?: RawRiskProfile | null,
): ResolvedRiskLimits | undefined {
  if (mode === "live" && !profile) {
    return undefined;
  }

  if (!profile) {
    return {
      maxPositionPct: PAPER_DEMO_DEFAULT_MAX_POSITION_PCT,
      maxExposurePct: PAPER_DEMO_DEFAULT_MAX_EXPOSURE_PCT,
      maxDailyLossPct: PAPER_DEMO_DEFAULT_MAX_DAILY_LOSS_PCT,
      allowedPairs: getAllowedPairs(mode),
      leverageAllowed: false,
      profileId: "default",
      profileName: "paper-demo",
    };
  }

  const baseLimits: ResolvedRiskLimits = {
    maxPositionPct: profile.max_position_pct ?? 2.0,
    maxExposurePct: profile.max_exposure_pct ?? 5.0,
    maxDailyLossPct: profile.max_daily_loss_pct ?? 1.0,
    allowedPairs: profile.allowed_pairs ?? ["BTCUSDT", "ETHUSDT"],
    leverageAllowed: profile.leverage_allowed ?? false,
    profileId: profile.id,
    profileName: profile.name,
  };

  // Paper: union av profilens tillatte par og kanonisk univers for å unngå
  // PAIR_NOT_ALLOWED på symboler appen faktisk viser.
  if (mode === "paper") {
    baseLimits.allowedPairs = [
      ...new Set([
        ...baseLimits.allowedPairs,
        ...PAPER_TRADING_UI_SYMBOLS,
      ]),
    ];
  }

  return baseLimits;
}
