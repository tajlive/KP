import { redirect } from "next/navigation";

export default function AdminRedirectPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  // KLA-101: Konsolider admin-ruter til /admin-dashboard
  redirect(`/${locale}/admin-dashboard`);
}
