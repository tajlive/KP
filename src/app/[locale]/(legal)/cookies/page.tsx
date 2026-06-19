import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ClientCookies from "./ClientCookies";

export const runtime = 'nodejs';

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("cookieTitle") };
}

export default function Page() {
  return <ClientCookies />;
}
