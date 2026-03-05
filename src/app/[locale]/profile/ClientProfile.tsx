"use client";

import { useProfile } from "@/hooks/useProfile";
import { createClient } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ClientProfile() {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { profile, loading, saving, error, save, patch, deleteProfile } =
    useProfile();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [risk, setRisk] = useState("normal");

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        const locale = (pathname ?? "/no").split("/")[1] || "no";
        const supportedLocales = ["no", "en", "th", "zh"];
        const safeLocale = supportedLocales.includes(locale) ? locale : "no";
        router.push(
          `/${safeLocale}/innlogging?next=${encodeURIComponent(pathname ?? "/")}`,
        );
      } else {
        setIsAuthenticated(true);
      }
      setAuthChecked(true);
    }
    checkAuth();
  }, [router, pathname]);

  if (!authChecked) {
    return <div className="max-w-xl mx-auto p-6 text-slate-400">Laster...</div>;
  }

  if (!isAuthenticated) {
    return null; // Vil redirecte
  }

  if (loading)
    return (
      <div className="max-w-xl mx-auto p-6 text-slate-400">
        Laster profil...
      </div>
    );

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <h1 className="text-2xl font-semibold mb-4 text-white">Profil</h1>
          <p className="text-slate-400">
            Ingen profil funnet. Lag en profil ved å fylle ut feltene under.
          </p>
          <div className="mt-4">
            <label htmlFor="fullName" className="text-sm text-slate-300">
              Navn
            </label>
            <input
              id="fullName"
              title="Fullt navn"
              placeholder="Skriv inn ditt fulle navn"
              className="w-full border border-slate-700 bg-slate-800 rounded px-3 py-2 mt-1 text-white"
              onChange={(e) => setFullName(e.target.value)}
            />
            <label
              htmlFor="avatarUrl"
              className="text-sm mt-3 block text-slate-300"
            >
              Avatar URL
            </label>
            <input
              id="avatarUrl"
              title="Avatar URL"
              placeholder="https://eksempel.com/bilde.jpg"
              className="w-full border border-slate-700 bg-slate-800 rounded px-3 py-2 mt-1 text-white"
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
            <label
              htmlFor="riskLevel"
              className="text-sm mt-3 block text-slate-300"
            >
              Risikonivå
            </label>
            <select
              id="riskLevel"
              title="Velg risikonivå"
              className="w-full border border-slate-700 bg-slate-800 rounded px-3 py-2 mt-1 text-white"
              onChange={(e) => setRisk(e.target.value)}
            >
              <option value="safe">Trygg</option>
              <option value="normal">Normal</option>
              <option value="advanced">Avansert</option>
            </select>
            <button
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              onClick={() =>
                save({
                  full_name: fullName,
                  avatar_url: avatarUrl,
                  risk_preference: risk,
                })
              }
            >
              {saving ? "Lagrer..." : "Opprett profil"}
            </button>
            {error && <div className="text-red-400 mt-2">{error}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <h1 className="text-2xl font-semibold text-white">Profil</h1>

        <div>
          <label htmlFor="profileName" className="text-sm text-slate-300">
            Navn
          </label>
          <input
            id="profileName"
            title="Ditt navn"
            placeholder="Navn"
            className="w-full border border-slate-700 bg-slate-800 rounded px-3 py-2 mt-1 text-white"
            defaultValue={profile.full_name ?? ""}
            onBlur={(e) => patch({ full_name: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="profileAvatar" className="text-sm text-slate-300">
            Avatar URL
          </label>
          <input
            id="profileAvatar"
            title="Profilbilde URL"
            placeholder="URL til profilbilde"
            className="w-full border border-slate-700 bg-slate-800 rounded px-3 py-2 mt-1 text-white"
            defaultValue={profile.avatar_url ?? ""}
            onBlur={(e) => patch({ avatar_url: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="profileRisk" className="text-sm text-slate-300">
            Risikonivå
          </label>
          <select
            id="profileRisk"
            title="Risikopreferanse"
            className="w-full border border-slate-700 bg-slate-800 rounded px-3 py-2 mt-1 text-white"
            defaultValue={profile.risk_preference ?? "normal"}
            onChange={(e) => patch({ risk_preference: e.target.value })}
          >
            <option value="safe">Trygg</option>
            <option value="normal">Normal</option>
            <option value="advanced">Avansert</option>
          </select>
        </div>

        <div>
          <button
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            onClick={async () => {
              (await profile) && deleteProfile();
              location.reload();
            }}
          >
            Slett profil
          </button>
        </div>

        {error && <div className="text-red-400">{error}</div>}
      </div>
    </div>
  );
}
