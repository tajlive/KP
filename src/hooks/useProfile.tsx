"use client";

import { createClient } from "@/lib/utils";
import { getErrorMessage } from "@/lib/utils/error";
import type { Database } from "@/types/database.types";
import { Profile } from "@/types/database";
import { useEffect, useState, useCallback } from "react";
import { useAuthSafe } from "@/lib/auth/new/AuthContext";

type UserProfilesInsert =
  Database["public"]["Tables"]["user_profiles"]["Insert"];
type UserProfilesUpdate =
  Database["public"]["Tables"]["user_profiles"]["Update"];

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hent userID fra AuthContext (ingen nettverkskall) ved render-tid
  const authCtx = useAuthSafe();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Bruk AuthContexts user (0 nettverkskall) hvis tilgjengelig
      let userId = authCtx.user?.id ?? null;
      if (!userId) {
        // Fallback: direct getUser() — kun utenfor AuthProvider
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id ?? null;
      }
      if (!userId) {
        setProfile(null);
        return;
      }
      const { data, error: fetchError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (fetchError) {
        setProfile(null);
      } else {
        setProfile(data as unknown as Profile);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [authCtx.user?.id]);

  const save = useCallback(async (updates: Partial<Profile>) => {
    setSaving(true);
    try {
      const supabase = createClient();
      let userId = authCtx.user?.id ?? null;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id ?? null;
      }
      if (!userId) {
        setError("Ikke innlogget");
        return;
      }
      const upsertPayload = {
        id: userId,
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      } as unknown as UserProfilesInsert;
      const { data, error: upsertError } = await supabase
        .from("user_profiles")
        .upsert(upsertPayload)
        .select()
        .single();
      if (upsertError) {
        setError(upsertError.message);
      } else {
        setProfile((data ?? null) as unknown as Profile | null);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }, [authCtx.user?.id]);

  const patch = useCallback(async (updates: Partial<Profile>) => {
    setSaving(true);
    try {
      const supabase = createClient();
      let userId = authCtx.user?.id ?? null;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id ?? null;
      }
      if (!userId) {
        setError("Ikke innlogget");
        return;
      }
      const payload = { ...updates, updated_at: new Date().toISOString() };
      if ("created_at" in payload && payload.created_at === null)
        delete (payload as Record<string, unknown>).created_at;
      const { data, error: updateError } = await supabase
        .from("user_profiles")
        .update(payload as unknown as UserProfilesUpdate)
        .eq("id", userId)
        .select()
        .single();
      if (updateError) {
        setError(updateError.message);
      } else {
        setProfile((data ?? null) as unknown as Profile | null);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }, [authCtx.user?.id]);

  const deleteProfile = useCallback(async () => {
    try {
      const supabase = createClient();
      let userId = authCtx.user?.id ?? null;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id ?? null;
      }
      if (!userId) return;
      await supabase.from("user_profiles").delete().eq("id", userId);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    }
  }, [authCtx.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, loading, saving, error, load, save, patch, deleteProfile };
}
