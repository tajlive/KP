import ClientCookies from "./ClientCookies";
import {
  LegalPageShell,
  generateLegalMetadata,
} from "@/shared/ui/marketing";

export const runtime = "nodejs";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateLegalMetadata({
    locale,
    namespace: "legal.cookies",
    titleKey: "title",
    pathname: "/cookies",
  });
}

export default async function CookiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <LegalPageShell
      locale={locale}
      namespace="legal.cookies"
      titleKey="title"
    >
      <ClientCookies />
    </LegalPageShell>
  );
}
