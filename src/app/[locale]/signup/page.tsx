



import { getTranslations } from "next-intl/server";
import { SignupClient } from "./SignupClient";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });

  return {
    title: t("signupTitle") || "Opprett konto | Klarpakke",
    description:
      t("signupDescription") ||
      "Registrer deg for å få tilgang til Klarpakke Universitet",
  };
}

export default function SignupPage() {
  return <SignupClient />;
}
