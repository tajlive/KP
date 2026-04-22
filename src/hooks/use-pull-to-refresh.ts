"use client";

import { useState, useRef, useCallback } from "react";
import { useHaptic } from "./use-haptic";

export interface PullToRefreshState {
  /** Distance user has pulled down (px) */
  distance: number;
  /** Whether user is currently pulling */
  isPulling: boolean;
  /** Whether refresh is in progress */
  isRefreshing: boolean;
  /** Whether pull distance has exceeded threshold (visual cue) */
  isReadyToRelease: boolean;
}

export interface PullToRefreshHandlers {
  onTouchStart: (e: React.TouchEvent<HTMLElement>) => void;
  onTouchMove: (e: React.TouchEvent<HTMLElement>) => void;
  onTouchEnd: () => void;
  onMouseDown: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseUp: () => void;
}

interface UsePullToRefreshOptions {
  /** Threshold in px to trigger refresh. Default: 80 */
  threshold?: number;
  /** Max pull distance in px. Default: 120 */
  maxDistance?: number;
  /** Resistance factor (0-1). Higher = harder to pull. Default: 0.7 */
  resistance?: number;
  /** Callback when refresh should trigger */
  onRefresh: () => Promise<void>;
  /** Haptic pattern on threshold reach. Default: 'medium' */
  hapticPattern?: "light" | "medium" | "heavy" | "none";
}

/**
 * Pull-to-refresh hook inspired by iOS native + Coinbase mobile app.
 *
 * Use on scrollable containers. Only triggers when scrollTop === 0.
 * Provides haptic feedback when threshold is reached.
 *
 * @example
 * const { state, handlers, style } = usePullToRefresh({
 *   onRefresh: async () => { await refetchPortfolio(); }
 * });
 *
 * <div
 *   onTouchStart={handlers.onTouchStart}
 *   onTouchMove={handlers.onTouchMove}
 *   onTouchEnd={handlers.onTouchEnd}
 *   style={style}
 * >
 *   <PullIndicator distance={state.distance} ready={state.isReadyToRelease} />
 *   <PortfolioList />
 * </div>
 */
export function usePullToRefresh(options: UsePullToRefreshOptions) {
  const {
    threshold = 80,
    maxDistance = 120,
    resistance = 0.7,
    onRefresh,
    hapticPattern = "medium",
  } = options;

  const haptic = useHaptic();
  const [state, setState] = useState<PullToRefreshState>({
    distance: 0,
    isPulling: false,
    isRefreshing: false,
    isReadyToRelease: false,
  });

  const startY = useRef(0);
  const isScrollTop = useRef(false);
  const hasTriggeredHaptic = useRef(false);
  const containerRef = useRef<HTMLElement | null>(null);

  const reset = useCallback(() => {
    setState({
      distance: 0,
      isPulling: false,
      isRefreshing: false,
      isReadyToRelease: false,
    });
    hasTriggeredHaptic.current = false;
  }, []);

  const checkScrollTop = useCallback((target: unknown) => {
    if (!target || !(target instanceof HTMLElement)) return false;
    containerRef.current = target;
    return target.scrollTop <= 0;
  }, []);

  const handleStart = useCallback(
    (clientY: number, target: unknown) => {
      isScrollTop.current = checkScrollTop(target);
      if (!isScrollTop.current) return;

      startY.current = clientY;
      setState((prev) => ({
        ...prev,
        isPulling: true,
        distance: 0,
        isReadyToRelease: false,
      }));
      hasTriggeredHaptic.current = false;
    },
    [checkScrollTop]
  );

  const handleMove = useCallback(
    (clientY: number) => {
      if (!isScrollTop.current || state.isRefreshing) return;

      const diff = clientY - startY.current;
      if (diff <= 0) return;

      const resisted = diff * resistance;
      const clamped = Math.min(resisted, maxDistance);
      const ready = clamped >= threshold;

      if (ready && !hasTriggeredHaptic.current && hapticPattern !== "none") {
        haptic(hapticPattern);
        hasTriggeredHaptic.current = true;
      }

      setState({
        distance: clamped,
        isPulling: true,
        isRefreshing: false,
        isReadyToRelease: ready,
      });
    },
    [state.isRefreshing, resistance, maxDistance, threshold, haptic, hapticPattern]
  );

  const handleEnd = useCallback(async () => {
    if (!isScrollTop.current) return;

    const shouldRefresh = state.distance >= threshold;

    if (!shouldRefresh) {
      reset();
      return;
    }

    setState((prev) => ({
      ...prev,
      isPulling: false,
      isRefreshing: true,
      distance: threshold,
    }));

    try {
      await onRefresh();
    } finally {
      reset();
    }
  }, [state.distance, threshold, onRefresh, reset]);

  const handlers: PullToRefreshHandlers = {
    onTouchStart: (e) => handleStart(e.touches[0].clientY, e.currentTarget),
    onTouchMove: (e) => {
      // Prevent default only when pulling down at top to avoid rubber-banding conflicts
      if (isScrollTop.current && e.touches[0].clientY > startY.current) {
        e.preventDefault();
      }
      handleMove(e.touches[0].clientY);
    },
    onTouchEnd: handleEnd,
    onMouseDown: (e) => handleStart(e.clientY, e.currentTarget),
    onMouseMove: (e) => {
      if (e.buttons !== 1) return;
      handleMove(e.clientY);
    },
    onMouseUp: handleEnd,
  };

  const style: React.CSSProperties = {
    transform: state.isPulling || state.isRefreshing
      ? `translateY(${state.distance}px)`
      : undefined,
    transition:
      !state.isPulling && !state.isRefreshing
        ? "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
        : undefined,
  };

  return { state, handlers, style, reset };
}
