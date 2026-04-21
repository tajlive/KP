import { redirect } from "next/navigation";

/**
 * /tradere → redirect til /copy-trading
 *
 * Den funksjonelle copy-trading-løsningen finnes på /copy-trading.
 * Denne siden var en "Coming soon"-placeholder — ikke lenger nødvendig.
 */
export default async function TraderePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/copy-trading`);
}
