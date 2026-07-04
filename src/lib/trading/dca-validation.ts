/**
 * Isomorphic DCA config validation / clamping.
 * Mirrors the server-side constraints used by the tick pipeline and
 * trading-sessions/create route.
 */

export const DCA_CONSTRAINTS = {
  maxPositionSize: 0.1, // 10%
  minIntervalMinutes: 60,
  defaultPositionSize: 0.04,
  defaultIntervalMinutes: 240,
} as const;

export interface DCAValidationResult {
  ok: boolean;
  position_size: number;
  interval_minutes: number;
  errors: string[];
}

/** Clamp DCA config values to safe bounds. */
export function clampDCAConfig(input: {
  position_size?: number | null | undefined;
  interval_minutes?: number | null | undefined;
}): { position_size: number; interval_minutes: number } {
  const rawPosition = Number(input.position_size ?? DCA_CONSTRAINTS.defaultPositionSize);
  const rawInterval = Number(input.interval_minutes ?? DCA_CONSTRAINTS.defaultIntervalMinutes);

  return {
    position_size: Number.isFinite(rawPosition)
      ? Math.max(0, Math.min(rawPosition, DCA_CONSTRAINTS.maxPositionSize))
      : DCA_CONSTRAINTS.defaultPositionSize,
    interval_minutes: Number.isFinite(rawInterval)
      ? Math.max(DCA_CONSTRAINTS.minIntervalMinutes, Math.round(rawInterval))
      : DCA_CONSTRAINTS.defaultIntervalMinutes,
  };
}

/** Validate DCA config values and report hard violations (not clamped). */
export function validateDCAConfig(input: {
  position_size?: number | null | undefined;
  interval_minutes?: number | null | undefined;
}): DCAValidationResult {
  const errors: string[] = [];
  const rawPosition = Number(input.position_size ?? DCA_CONSTRAINTS.defaultPositionSize);
  const rawInterval = Number(input.interval_minutes ?? DCA_CONSTRAINTS.defaultIntervalMinutes);

  if (!Number.isFinite(rawPosition) || rawPosition < 0) {
    errors.push("position_size must be a non-negative number");
  } else if (rawPosition > DCA_CONSTRAINTS.maxPositionSize) {
    errors.push(
      `position_size (${rawPosition}) exceeds maximum allowed ${DCA_CONSTRAINTS.maxPositionSize}`,
    );
  }

  if (!Number.isFinite(rawInterval) || rawInterval < DCA_CONSTRAINTS.minIntervalMinutes) {
    errors.push(
      `interval_minutes (${rawInterval}) is below minimum allowed ${DCA_CONSTRAINTS.minIntervalMinutes}`,
    );
  }

  return {
    ok: errors.length === 0,
    position_size: rawPosition,
    interval_minutes: rawInterval,
    errors,
  };
}
