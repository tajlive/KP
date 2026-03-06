import { redirect } from "next/navigation";

export default async function ResetPasswordRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/glemt-passord`);
}
