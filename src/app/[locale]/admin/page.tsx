import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminPage({ params }: PageProps) {
  const { locale } = await params;
  // Admin root redirects to analytics dashboard
  redirect(`/${locale}/admin/analytics`);
}
