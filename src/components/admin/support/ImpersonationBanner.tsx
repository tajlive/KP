"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, ShieldAlert, XCircle } from "lucide-react";

export interface ImpersonationBannerState {
  targetUserId: string;
  targetEmail?: string;
  targetDisplayName?: string;
  expiresAt?: string;
}

function parseBannerCookie(): ImpersonationBannerState | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(/(?:^|; )__impersonation_banner=([^;]+)/);
  if (!match) return null;

  try {
    const decoded = decodeURIComponent(match[1]);
    const parsed = JSON.parse(decoded) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "targetUserId" in parsed &&
      typeof (parsed as Record<string, unknown>).targetUserId === "string"
    ) {
      return parsed as ImpersonationBannerState;
    }
  } catch {
    // Ignore malformed cookie
  }
  return null;
}

export default function ImpersonationBanner() {
  const t = useTranslations("admin.impersonation");
  const [state, setState] = useState<ImpersonationBannerState | null>(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    setState(parseBannerCookie());

    const handleFocus = () => {
      setState(parseBannerCookie());
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  if (!state) return null;

  const displayName =
    state.targetDisplayName || state.targetEmail || state.targetUserId;

  const handleEnd = async () => {
    setEnding(true);
    try {
      const res = await fetch("/api/admin/support/impersonate/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // eslint-disable-next-line no-console
        console.error("[ImpersonationBanner] Failed to end session:", body);
      }
    } finally {
      // Always reload so the middleware clears cookies and restores the admin session
      window.location.reload();
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert className="w-5 h-5 shrink-0" aria-hidden="true" />
          <Eye className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-sm truncate">
            {t("banner", { user: displayName })}
          </span>
        </div>
        <button
          type="button"
          onClick={handleEnd}
          disabled={ending}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 text-amber-500 rounded-md text-sm font-semibold hover:bg-slate-900 transition-colors disabled:opacity-60"
          aria-label={t("endSessionAria")}
        >
          <XCircle className="w-4 h-4" aria-hidden="true" />
          {ending ? t("ending") : t("endSession")}
        </button>
      </div>
    </div>
  );
}
