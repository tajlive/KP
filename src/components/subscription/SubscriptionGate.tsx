"use client";

import { createClient } from "@/lib/utils";
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
  const supabase = createClient();
  const locale = useLocale();

  useEffect(() => {
    const checkEntitlements = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setEntitlements({ tier: "student", hasAccess: false });
          setLoading(false);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setEntitlements({ tier: "student", hasAccess: false });
          setLoading(false);
          return;
        }
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

        // Kall get-entitlements edge function
        const response = await fetch(
          `${supabaseUrl}/functions/v1/get-entitlements`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session?.access_token || ""}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          // Fallback: sjekk profiles-tabellen direkte
          const { data: profile } = await supabase
            .from("user_profiles" as unknown)
            .select("subscription_tier, subscription_status")
            .eq("id", user.id)
            .single() as unknown;

          const tier = (profile?.subscription_tier as TierSlug) || "student";
          const hasAccess = checkTierAccess(tier, requiredTier);

          setEntitlements({
            tier,
            hasAccess,
            expiresAt: undefined,
          });
          setLoading(false);
          return;
        }

        const data = await response.json();
        const tier = (data.tier as TierSlug) || "student";
        const hasAccess = checkTierAccess(tier, requiredTier);

        setEntitlements({
          tier,
          hasAccess,
          expiresAt: data.expires_at,
        });
      } catch (error) {
        console.error("Error checking entitlements:", error);
        setEntitlements({ tier: "student", hasAccess: false });
      } finally {
        setLoading(false);
      }
    };

    checkEntitlements();
  }, [supabase, requiredTier]);

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
  const supabase = createClient();

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setTier("student");
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("user_profiles" as unknown)
          .select("subscription_tier")
          .eq("id", user.id)
          .single() as unknown;

        setTier((profile?.subscription_tier as TierSlug) || "student");
      } catch (error) {
        console.error("Error fetching subscription:", error);
        setTier("student");
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [supabase]);

  return { tier, loading };
}
