"use client";

import { createClient } from "@/lib/utils";
import { getErrorMessage } from "@/lib/utils/error";
import { Profile } from "@/types/database";
import { useEffect, useState } from "react";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        return;
      }
      const { data, error: fetchError } = (await supabase
        .from("user_profiles" as unknown)
        .select("*")
        .eq("id", user.id)
        .single()) as unknown;
      if (fetchError) {
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function save(updates: Partial<Profile>) {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Ikke innlogget");
        return;
      }
      const { data, error: upsertError } = (await supabase
        .from("user_profiles" as unknown)
        .upsert({
          id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()) as unknown;
      if (upsertError) {
        setError(upsertError.message);
      } else {
        setProfile(data);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function patch(updates: Partial<Profile>) {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Ikke innlogget");
        return;
      }
      const { data, error: updateError } = (await supabase
        .from("user_profiles" as unknown)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", user.id)
        .select()
        .single()) as unknown;
      if (updateError) {
        setError(updateError.message);
      } else {
        setProfile(data);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteProfile() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("user_profiles" as unknown)
        .delete()
        .eq("id", user.id);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  return { profile, loading, saving, error, load, save, patch, deleteProfile };
}
