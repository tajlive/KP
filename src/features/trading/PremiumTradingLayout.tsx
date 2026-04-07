"use client";

/**
 * Handels-UI layout-kontrakt (kort):
 * - Bruk `PremiumTradingShell` som vertikal rytme (`space-y-6`) når hele siden er «produkt» (hub, sesjon, bot, resultater).
 * - Topp: `PremiumTradingHero` eller kompakt `PremiumStatusBanner`; modus (paper/live) tydelig der det påvirker risiko.
 * - Begrens innholdsbredden på `Shell` med `max-w-* mx-auto` + `px-4`; mobil: ekstra `pb` (f.eks. `pb-16`) så fast bunn-UI ikke overlapper.
 */

import { BRAND, RADIUS, SHADOW, SURFACE } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PremiumTradingShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}

export function PremiumTradingHero({
  eyebrow,
  title,
  subtitle,
  chips,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  chips?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 p-6 dark:border-slate-800/80 dark:from-slate-950 dark:via-slate-900 dark:to-[#001339] md:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border border-[#0052FF]/25"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0052FF]">
            {eyebrow}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              {subtitle}
            </p>
          ) : null}
          {chips ? (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">{chips}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

export function PremiumStatusBanner({
  children,
  danger = false,
}: {
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        `rounded-2xl border px-4 py-3 text-sm ${RADIUS.card}`,
        danger
          ? "border-red-500/30 bg-red-950/40 text-red-200"
          : cn("border-slate-200/80 bg-white/90 text-slate-600 dark:border-slate-800/80 dark:text-slate-400", SURFACE.glass.low),
      )}
    >
      {children}
    </div>
  );
}

export function PremiumPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        `${SURFACE.glass.medium} p-5 ${RADIUS.card} ${SHADOW.card} dark:bg-white/[0.05]`,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PremiumActionButton({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        `inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#0052FF]/40 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 ${BRAND.focusRing}`,
        className,
      )}
    >
      {children}
    </span>
  );
}
