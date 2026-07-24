"use client";

import { getErrorMessage } from "@/lib/utils/error";
import { Profile } from "@/types/database";
import { useEffect, useState, useCallback } from "react";

/**
 * useProfile — leser/skriver brukerprofil via /api/user/profile.
 *
 * KLA-auth: browser-supabase er ALLTID anon (httpOnly auth-cookie),
 * så direkte .from("user_profiles") gir 0 rader (RLS) og falsk
 * "ingen profil". All profil-data går derfor gjennom server-ruta
 * som gjør getUser() + eksplisitt user_id-filter.
 */
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        setProfile(null);
        if (res.status !== 401) setError(body?.error ?? null);
      } else {
        setProfile((body.profile ?? null) as unknown as Profile | null);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (updates: Partial<Profile>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        setError(body?.error ?? "Lagring feilet");
      } else {
        setProfile((body.profile ?? null) as unknown as Profile | null);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }, []);

  // patch og save er samme operasjon server-side (upsert av whitelistet felt)
  const patch = save;

  const deleteProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile", {
        method: "DELETE",
        credentials: "same-origin",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        setError(body?.error ?? "Sletting feilet");
      } else {
        setProfile(null);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, loading, saving, error, load, save, patch, deleteProfile };
}
