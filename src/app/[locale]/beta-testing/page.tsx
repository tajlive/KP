import { redirect } from "next/navigation";

export default function BetaTestingRedirectPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  // KLA-101: Beta-testing er konsolidert til /beta
  redirect(`/${locale}/beta`);
}
