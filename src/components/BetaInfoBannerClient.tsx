"use client";

import { useAuthSafe } from "@/lib/auth/new/AuthContext";
import { BetaInfoBanner } from "@/components/BetaInfoBanner";

/**
 * BetaInfoBannerClient — viser BetaInfoBanner kun for innloggede kunder.
 * Bruker useAuthSafe (faller tilbake til null når AuthProvider mangler,
 * f.eks. på rene marketing-ruter).
 */
export function BetaInfoBannerClient() {
  const { user } = useAuthSafe();
  if (!user) return null;
  return <BetaInfoBanner />;
}
