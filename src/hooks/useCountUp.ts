"use client";

import { useEffect, useRef, useState } from "react";

interface UseCountUpOptions {
  start?: number;
  end: number;
  duration?: number;
  onComplete?: () => void;
}

export function useCountUp({
  start = 0,
  end,
  duration = 800,
  onComplete,
}: UseCountUpOptions): number {
  const [value, setValue] = useState<number>(start);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(start);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReduced) {
      setValue(end);
      onComplete?.();
      return;
    }

    startValueRef.current = value;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - (startTimeRef.current || timestamp);
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current =
        startValueRef.current + (end - startValueRef.current) * eased;
      setValue(Math.round(current));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setValue(end);
        onComplete?.();
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration, onComplete]);

  return value;
}
