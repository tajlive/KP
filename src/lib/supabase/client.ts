import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase-generated";

/**
 * Creates a Supabase browser client for use in Client Components.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Type-safe helpers
export type Tables<T extends keyof Database["public"]["Tables"]> = 
  Database["public"]["Tables"][T]["Row"];

export type Enums<T extends keyof Database["public"]["Enums"]> = 
  Database["public"]["Enums"][T];
