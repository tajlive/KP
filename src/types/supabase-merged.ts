// ═══════════════════════════════════════════════════════════════
// Merged Database Types
// Kombinerer genererte typer med patches for manglende tabeller
// ═══════════════════════════════════════════════════════════════

import type { Database as GeneratedDatabase } from "./database.types";
import type { DatabasePatch } from "@/lib/database.types.patch";

// Deep merge utility types
type MergeTables<
  Generated extends Record<string, unknown>,
  Patch extends Record<string, unknown>
> = {
  [K in keyof Generated | keyof Patch]: K extends keyof Patch
    ? Patch[K]
    : K extends keyof Generated
    ? Generated[K]
    : never;
};

// Merge the Database types
export type Database = {
  __InternalSupabase: GeneratedDatabase["__InternalSupabase"];
  public: {
    Tables: MergeTables<
      GeneratedDatabase["public"]["Tables"],
      DatabasePatch["public"]["Tables"]
    >;
    Views: GeneratedDatabase["public"]["Views"];
    Functions: GeneratedDatabase["public"]["Functions"];
    Enums: GeneratedDatabase["public"]["Enums"];
    CompositeTypes: GeneratedDatabase["public"]["CompositeTypes"];
  };
};

// Export helper type for tables
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T];

export type TablesRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
