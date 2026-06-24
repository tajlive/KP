import ClientPersonvern from "./ClientPersonvern";
import {
  LegalPageShell,
  generateLegalMetadata,
} from "@/shared/ui/marketing";

export const runtime = "nodejs";

export const revalidate = 86400; // 24 hours

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateLegalMetadata({
    locale,
    namespace: "legal.privacy",
    titleKey: "title",
    descriptionKey: "description",
    pathname: "/personvern",
  });
}

export default async function PersonvernPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <LegalPageShell>
      <ClientPersonvern />
    </LegalPageShell>
  );
}
