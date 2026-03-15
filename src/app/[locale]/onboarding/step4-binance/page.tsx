"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Link2, SkipForward, Eye, EyeOff, Shield } from "lucide-react";

export default function OnboardingStep4() {
  const t = useTranslations("onboarding.step4");
  const router = useRouter();
  const supabase = createClient();
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Sjekk auth
  useEffect(() => {
    const checkStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/onboarding/step4-binance");
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_step, onboarding_completed, binance_connected")
        .eq("user_id" as unknown, user.id)
        .single() as unknown;

      if (profile?.onboarding_completed) {
        router.push("/dashboard");
        return;
      }

      // Redirect hvis brukeren er på feil steg
      if (!profile?.onboarding_step || profile.onboarding_step < 3) {
        const steps = [
          "/onboarding/step1-welcome",
          "/onboarding/step2-experience",
          "/onboarding/step3-trading-mode",
          "/onboarding/step4-binance",
        ];
        router.push(steps[profile?.onboarding_step || 0]);
        return;
      }

      if (profile.onboarding_step > 3) {
        const steps = [
          "/onboarding/step1-welcome",
          "/onboarding/step2-experience",
          "/onboarding/step3-trading-mode",
          "/onboarding/step4-binance",
          "/onboarding/step5-complete",
        ];
        router.push(steps[profile.onboarding_step]);
        return;
      }

      // Hvis allerede koblet, gå videre
      if (profile?.binance_connected) {
        router.push("/onboarding/step5-complete");
        return;
      }

      setInitializing(false);
    };

    checkStatus();
  }, [router, supabase]);

  const handleConnect = async () => {
    if (!apiKey || !apiSecret) return;

    setConnecting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Ikke autentisert");

      // Kall API for å validere og lagre Binance keys
      const response = await fetch("/api/binance/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          apiSecret,
          isTestnet: true, // Alltid testnet først
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Kunne ikke koble til Binance");
      }

      // Oppdater profil
      const { error } = await supabase
        .from("user_profiles")
        .update({
          onboarding_step: 4,
          binance_connected: true,
        })
        .eq("user_id" as unknown, user.id);

      if (error) throw error;

      router.push("/onboarding/step5-complete");
    } catch (err) {
      console.error("Failed to connect Binance:", err);
      alert(err instanceof Error ? err.message : t("error"));
      setConnecting(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Ikke autentisert");

      // Oppdater onboarding_step uten å koble Binance
      const { error } = await supabase
        .from("user_profiles")
        .update({
          onboarding_step: 4,
        })
        .eq("user_id" as unknown, user.id);

      if (error) throw error;

      router.push("/onboarding/step5-complete");
    } catch (err) {
      console.error("Failed to skip:", err);
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
          <Link2 className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("title")}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">{t("subtitle")}</p>
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
        <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">{t("security.title")}</p>
          <p className="mt-1">{t("security.description")}</p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="binance-api-key" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("apiKey.label")}
          </label>
          <Input
            id="binance-api-key"
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t("apiKey.placeholder")}
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="binance-api-secret" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("apiSecret.label")}
          </label>
          <div className="relative">
            <Input
              id="binance-api-secret"
              type={showSecret ? "text" : "password"}
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder={t("apiSecret.placeholder")}
              className="h-12 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showSecret ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Connect Button */}
      <Button
        onClick={handleConnect}
        className="w-full h-12 text-lg font-semibold"
        size="lg"
        disabled={!apiKey || !apiSecret || connecting}
      >
        {connecting ? t("connecting") : t("cta")}
      </Button>

      {/* Skip Link */}
      <button
        onClick={handleSkip}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors py-2"
      >
        <SkipForward className="w-4 h-4" />
        {loading ? t("skipping") : t("skip")}
      </button>
    </div>
  );
}
