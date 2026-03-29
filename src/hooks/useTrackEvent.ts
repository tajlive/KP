'use client';

import { useCallback, useRef, useEffect } from 'react';
import { track, AnalyticsEvent } from '@/lib/analytics';

export function useTrackEvent() {
  return useCallback(<T extends AnalyticsEvent>(event: T) => {
    track(event);
  }, []);
}

export function useTrackOnMount<T extends AnalyticsEvent>(
  event: T,
  deps: unknown[] = []
) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;
    track(event);
  }, deps);
}

export function useTrackOnUnmount<T extends AnalyticsEvent>(event: T) {
  const eventRef = useRef(event);
  eventRef.current = event;

  useEffect(() => {
    return () => {
      track(eventRef.current);
    };
  }, []);
}
