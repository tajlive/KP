"use client";

import { useEffect } from "react";

/**
 * Midlertidig workaround for korrupte Supabase-sesjoner i localStorage.
 * Kjører ved hver sideload FØR hydratering for å rydde korrupte sb-* nøkler.
 * 
 * KRITISK PROD-FEIL: Dette er en midlertidig fiks for brukere med korrupte sesjoner.
 * Kan fjernes når rotårsaken er fikset (sannsynligvis gotrue-js encoding bug).
 */
export function SessionCleanup() {
  useEffect(() => {
    // Midlertidig: rydd korrupt sesjon ved sideload
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        
        Object.keys(localStorage)
          .filter((k) => k.startsWith("sb-"))
          .forEach((k) => {
            try {
              const value = localStorage.getItem(k);
              if (value !== null) {
                JSON.parse(value);
              }
            } catch {
              keysToRemove.push(k);
              localStorage.removeItem(k);
            }
          });
        
        if (keysToRemove.length > 0) {
          console.warn("[SessionCleanup] Fjernet korrupte sesjonsnøkler:", keysToRemove);
        }
      } catch (e) {
        // Ignorer feil hvis localStorage er utilgjengelig
        console.warn("[SessionCleanup] Kunne ikke aksessere localStorage:", e);
      }
    }
  }, []);

  // Denne komponenten rendrer ingenting
  return null;
}
