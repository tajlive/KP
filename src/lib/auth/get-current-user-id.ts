/**
 * Shared utility for å hente "current user ID" uten dupliserte getUser()-kall.
 *
 * Prioritet:
 * 1. AuthContext.user (0 nettverkskall) — best, men krever React-kontekst
 * 2. Fallback: direkte getUser() — for zustand stores/server actions
 *
 * Stores (zustand) kan ikke bruke React hooks, så de faller alltid til #2.
 * Men getUser()-kall i user-triggerede actions (follow, unfollow) er OK —
 * det er mount-tid og render-loop som skaper stormen.
 */

import { createClient } from "@/lib/supabase/client";

/**
 * Hent user ID. Brukes av actions (follow, unfollow, save) som trenger
 * brukerens ID men som ikke er en del av render-syklusen.
 *
 * For mount-tid getUser(), bruk heller AuthContext via useAuth().
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}
