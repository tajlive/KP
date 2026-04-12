"use client";

import { useEffect, useState } from "react";

/**
 * Hook som returnerer true kun på klienten (etter hydration)
 * Brukes for å unngå hydration mismatch på dynamisk innhold
 * 
 * @example
 * const isClient = useClientOnly();
 * return isClient ? <ClientContent /> : <ServerFallback />;
 */
export function useClientOnly() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

/**
 * Variasjon med initial delay for smooth transitions
 * @param delayMs - Millisekunder å vente før isClient blir true
 */
export function useClientOnlyWithDelay(delayMs = 0) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsClient(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return isClient;
}
