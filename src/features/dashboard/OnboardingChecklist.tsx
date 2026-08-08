"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { trackOnboardingStep } from "@/lib/analytics/onboarding-events";

interface OnboardingChecklistProps {
  /** Brukeren har en aktiv konto (alltid true for innloggede, men testbart) */
  hasAccount: boolean;
  /** Antall paper-trades brukeren har gjort (ekte data fra trades-tabellen) */
  tradeCount: number;
  /** Om brukeren har åpnet historikk-siden minst én gang */
  hasViewedHistory: boolean;
}

/**
 * Datadrevet sjekkliste for NyBruker-viewet. Erstatter statisk
 * OnboardingProgress — punktene hukes av med ekte data, ikke lokal gjetting.
 * Ref .hermes/plans/2026-07-22_225030-ny-bruker-reise.md (Alternativ B+A).
 */
export function OnboardingChecklist({
  hasAccount,
  tradeCount,
  hasViewedHistory,
}: OnboardingChecklistProps) {
  const t = useTranslations("dashboard.onboardingChecklist");

  // Funnel: sjekklisten er sett (dedupes i helper + server)
  useEffect(() => {
    trackOnboardingStep("checklist_viewed");
  }, []);

  const items = [
    {
      id: "account",
      done: hasAccount,
      label: t("accountCreated"),
      href: null as string | null,
    },
    {
      id: "first-trade",
      done: tradeCount > 0,
      label: t("firstTrade"),
      href: "/handel?first=1",
    },
    {
      id: "see-result",
      done: hasViewedHistory,
      label: t("seeResult"),
      href: "/dashboard/historikk",
    },
  ];

  const allDone = items.every((item) => item.done);

  if (allDone) {
    return (
      <div
        data-testid="checklist-complete"
        className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-center"
      >
        <p className="text-emerald-300 font-medium">{t("complete")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
      <p className="text-sm font-semibold text-slate-300 mb-3">{t("title")}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            data-testid={`check-${item.id}`}
            data-done={item.done}
            className="flex min-h-[48px] items-center gap-3"
          >
            <span
              className={item.done ? "text-emerald-400" : "text-slate-600"}
              aria-hidden
            >
              {item.done ? <Check size={20} /> : <Circle size={20} />}
            </span>
            {item.href && !item.done ? (
              <Link
                href={item.href}
                className="text-base font-medium text-white underline-offset-4 hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  item.done
                    ? "text-base text-slate-500 line-through"
                    : "text-base text-slate-300"
                }
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
