import { requireAuth } from "@/lib/auth-guard";
import { localizedPathname } from "@/middleware/locale-path";
import { ReferralDashboard } from "@/features/referral/ReferralDashboard";

export const metadata = {
  title: "Golden Ticket | Klarpakke",
  description: "Tjen gratis Master-tier ved å invitere venner.",
};

export const dynamic = "force-dynamic";

export default async function ReferralPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAuth(locale, localizedPathname(locale, "/dashboard/referral"));
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-white">
          The Golden Ticket
        </h2>
      </div>
      <ReferralDashboard />
    </div>
  );
}
