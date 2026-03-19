/**
 * Konsolidert: Handelshistorikk er én side.
 * Redirect /dashboard/activity → /handelshistorikk
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ActivityPage({ params }: PageProps) {
  const { locale } = await params;
  redirect(`/${locale}/handelshistorikk`);
}
