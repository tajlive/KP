

// English alias for /no/priser/


import { getTranslations } from "next-intl/server";
import PriserPage from "../priser/page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("pricing") || "Pricing",
    description:
      t("pricingDescription") || "Simple pricing for crypto education",
  };
}

export default PriserPage;
