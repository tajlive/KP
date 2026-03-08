import { redirect } from "next/navigation";

export default async function LoginRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const ref = sp?.ref ? `?ref=${sp.ref}` : '';
  redirect(`/${locale}/innlogging${ref}`);
}
