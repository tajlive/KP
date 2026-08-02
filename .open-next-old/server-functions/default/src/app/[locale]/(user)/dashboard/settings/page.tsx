import { redirect } from "next/navigation";

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/profile?tab=settings`);
}
