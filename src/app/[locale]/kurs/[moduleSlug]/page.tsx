import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string; moduleSlug: string }>;
}

export default async function ModulePage({ params }: PageProps) {
  const { locale } = await params;
  redirect(`/${locale}/kurs`);
}
