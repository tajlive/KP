import { redirect } from "next/navigation";

export const runtime = 'edge';

const SUPPORTED_LOCALES = ["no", "en", "th", "zh"] as const;

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Varsler/innstillinger – redirect til hovedsiden varsler.
 * NotificationBell lenker hit; ClientVarsler på /varsler har allerede varslingsinnstillinger.
 * Ref: docs/ANALYSE-RUTER-DESIGN-SIGNALER-2026.md P0#2
 */
export default async function VarslerInnstillingerPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = SUPPORTED_LOCALES.includes(
    rawLocale as (typeof SUPPORTED_LOCALES)[number],
  )
    ? rawLocale
    : "no";
  redirect(`/${locale}/varsler`);
}
