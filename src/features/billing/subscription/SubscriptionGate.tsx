"use client";

import { TierSlug, getTierDisplayName } from "@/types/subscription";
import { Loader2, Lock } from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

interface SubscriptionGateProps {
  children: React.ReactNode;
  requiredTier: TierSlug;
  fallback?: React.ReactNode;
}

interface UserEntitlements {
  tier: TierSlug;
  hasAccess: boolean;
  expiresAt?: string;
}

// Tier-nivåer for tilgangskontroll (høyere = mer tilgang)
const tierLevels: Record<TierSlug, number> = {
  student: 0,
  bachelor: 1,
  master: 2,
  phd: 3,
  professor: 4,
};

export function SubscriptionGate({
  children,
  requiredTier,
  fallback,
}: SubscriptionGateProps) {
  const [loading, setLoading] = useState(true);
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(
    null,
  );
  const locale = useLocale();

  useEffect(() => {
    const checkEntitlements = async () => {
      try {
        // KLA-auth: browser-klienten er alltid anon (httpOnly auth-cookie).
        // Edge-funksjonen get-entitlements finnes ikke deployet, og
        // browser-klienten kan uansett ikke lese user_profiles (RLS + anon).
        // Tier hentes via server-API som leser auth-cookie.
        const res = await fetch("/api/user/profile", {
          credentials: "same-origin",
        });

        if (res.status === 401) {
          setEntitlements({ tier: "student", hasAccess: false });
          return;
        }

        const json = await res.json().catch(() => null);
        const tier = (json?.profile?.tier as TierSlug) || "student";
        const hasAccess = checkTierAccess(tier, requiredTier);

        setEntitlements({
          tier,
          hasAccess,
          expiresAt: undefined,
        });
      } catch (error) {
        console.error("Error checking entitlements:", error);
        setEntitlements({ tier: "student", hasAccess: false });
      } finally {
        setLoading(false);
      }
    };

    checkEntitlements();
  }, [requiredTier]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!entitlements?.hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          Krever {getTierDisplayName(requiredTier)}
        </h3>
        <p className="text-slate-400 mb-6">
          Du har for øyeblikket{" "}
          {getTierDisplayName(entitlements?.tier || "student")}. Oppgrader for å
          få tilgang til denne funksjonen.
        </p>
        <Link
          href={`/${locale}/priser`}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Se priser
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Sjekk om brukerens tier gir tilgang til påkrevd tier
 */
function checkTierAccess(userTier: TierSlug, requiredTier: TierSlug): boolean {
  return tierLevels[userTier] >= tierLevels[requiredTier];
}

/**
 * Hook for å sjekke abonnementstatus
 */
export function useSubscription() {
  const [tier, setTier] = useState<TierSlug>("student");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        // KLA-auth: tier via server-API (browser-klient er alltid anon)
        const res = await fetch("/api/user/profile", {
          credentials: "same-origin",
        });

        if (res.status === 401) {
          setTier("student");
          return;
        }

        const json = await res.json().catch(() => null);
        setTier((json?.profile?.tier as TierSlug) || "student");
      } catch (error) {
        console.error("Error fetching subscription:", error);
        setTier("student");
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  return { tier, loading };
}
