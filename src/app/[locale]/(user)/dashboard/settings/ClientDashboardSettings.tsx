"use client";

import { useEffect, useState } from "react";
import { KrakenAPISettings } from "@/features/account";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { Card } from "@coinbase/cds-web/cards";
import { Text } from "@coinbase/cds-web/typography";

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
}

export default function ClientDashboardSettings() {
  const params = useParams();
  const _locale = params?.locale as string;
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // KLA-auth: browser-klienten er alltid anon (httpOnly auth-cookie) —
        // brukerdata hentes via server-API (profile inkluderer email)
        const res = await fetch("/api/user/profile", {
          credentials: "same-origin",
        });
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const json = await res.json().catch(() => null);
        const profile = json?.profile;
        if (!profile) {
          setLoading(false);
          return;
        }
        setUser({
          id: profile.id,
          email: profile.email || "",
          full_name: profile.full_name || null,
        });
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-4 py-2">
      <Card className="border border-slate-200 bg-white p-5 shadow-sm">
        <Text as="h1" className="text-xl font-semibold text-slate-900">
          Kraken API
        </Text>
        <Text as="p" className="mt-1 text-sm text-slate-600">
          Koble konto for live-handel og verifiser tilgangen (Kraken — eneste støttede børs for norske brukere).
        </Text>
      </Card>
      <KrakenAPISettings />
    </div>
  );
}
