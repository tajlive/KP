"use client";

import UnifiedTradingDashboard from "@/components/trading/UnifiedTradingDashboard";
import { ExchangeApiSettings } from "@/components/settings/ExchangeApiSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/utils";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";

export default function ClientAutoTradingPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "no";
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [hasBinanceConnection, setHasBinanceConnection] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Du må være logget inn");
        return;
      }

      setUser(user);

      // Sjekk om bruker har Binance tilkobling (fra user_profiles)
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("binance_connected")
        .eq("id", user.id)
        .single();

      setHasBinanceConnection(profile?.binance_connected || false);
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
          <Button onClick={() => (window.location.href = `/${locale}/innlogging`)}>
            Gå til innlogging
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step 1: Koble til Binance
  if (!hasBinanceConnection) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Auto-Trading Oppsett
          </h1>
          <p className="text-slate-400">Steg 1 av 2: Koble til din exchange</p>
        </div>

        <ExchangeApiSettings />
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
          onClick={() => setHasBinanceConnection(false)}
          className="border-slate-700 text-slate-400"
        >
          API-innstillinger
        </Button>
      </div>

      <UnifiedTradingDashboard />
    </div>
  );
}
