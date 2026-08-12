"use client";

/**
 * MoneyDataBadge — reversibel UI-guardrail (P0 2026-08-12).
 *
 * Vises ved siden av pengetall når datakilde, valuta, baseline eller
 * dataalder ikke kan verifiseres. Merker i stedet for å skjule —
 * brukeren ser fortsatt tallet, men med eksplisitt varsel.
 *
 * Skjules helt bak NEXT_PUBLIC_MONEY_GUARDRAILS=true (feature flag).
 */

import { assessMoneyDataHealth, type MoneyDataHealthInput } from "@/lib/trading/money-data-health";

export function moneyGuardrailsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MONEY_GUARDRAILS === "true";
}

export function MoneyDataBadge({ input }: { input: MoneyDataHealthInput }) {
  if (!moneyGuardrailsEnabled()) return null;
  const status = assessMoneyDataHealth(input);
  if (status === "verified") return null;

  const label =
    status === "stale"
      ? "⚠️ Kan være utdatert"
      : "⚠️ Datakilde ikke verifisert";

  return (
    <span
      className="ml-2 inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400"
      title={`Kilde: ${input.source ?? "ukjent"}${
        input.updatedAt
          ? ` · oppdatert ${new Date(input.updatedAt).toLocaleString("nb-NO")}`
          : ""
      }${input.currency ? ` · ${input.currency}` : ""}`}
    >
      {label}
    </span>
  );
}
