"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, AlertCircle, Building2 } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import KrakenAPISettings from "@/features/account/settings/KrakenAPISettings";
import UnifiedTradingDashboard from "@/features/trading/UnifiedTradingDashboard";

interface User {
  id: string;
}

export default function ClientAutoTradingPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "no";
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [hasKrakenConnection, setHasKrakenConnection] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const res = await fetch("/api/trading/mode", {
        credentials: "same-origin",
      });
      if (!res.ok) {
        toast.error("Du må være logget inn");
        return;
      }
      const data = await res.json();

      setUser({ id: data.userId ?? "user" });

      // EU/EØS 2026: live-tilkobling = Kraken-nøkler
      setHasKrakenConnection(Boolean(data.krakenConnected));
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="max-w-md mx-auto bg-slate-900 border-slate-800">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Ikke logget inn</h2>
          <p className="text-slate-400 mb-4">
            Du må logge inn for å bruke auto-trading.
          </p>
          <Button onClick={() => router.push(`/${locale}/innlogging`)}>
            Gå til innlogging
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step 1: Koble til Kraken
  if (!hasKrakenConnection) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Auto-Trading Oppsett
          </h1>
          <p className="text-slate-400">Steg 1 av 2: Koble til din exchange</p>
        </div>

        <KrakenAPISettings />
      </div>
    );
  }

  // Step 2: Vis unified dashboard
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Auto-Trading Dashboard
          </h1>
          <p className="text-slate-400">Din personlige trading-assistent</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setHasKrakenConnection(false)}
          className="border-slate-700 text-slate-400"
        >
          <Building2 className="w-4 h-4 mr-2" />
          API-innstillinger
        </Button>
      </div>

      <UnifiedTradingDashboard />
    </div>
  );
}
