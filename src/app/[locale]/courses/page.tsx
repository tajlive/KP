

// English alias for /no/kurs/


import { getTranslations } from "next-intl/server";
import KursPage from "../kurs/page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("courses") || "Courses",
    description: t("coursesDescription") || "Learn cryptocurrency trading",
  };
}

export default KursPage;
