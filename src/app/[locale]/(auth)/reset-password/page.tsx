import { ResetPasswordClient } from "./ResetPasswordClient";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("resetPassword.title") || "Reset password - Klarpakke",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
