import { redirect } from "next/navigation";

export default function SuperAdminRedirectPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  // KLA-101: Super-admin funksjonalitet er nå i /admin-dashboard
  redirect(`/${locale}/admin-dashboard`);
}
