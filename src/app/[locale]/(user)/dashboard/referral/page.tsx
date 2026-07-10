import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { ReferralDashboard } from "@/features/account/referral/ReferralDashboard";
import { ReferralCard } from "@/features/referral/ReferralCard";

export const runtime = 'nodejs';

export const metadata = {
  title: "Verv en venn | Klarpakke",
  description: "Få 5 000 kr i lekepenger for hver venn du inviterer til å trade.",
};

export const dynamic = "force-dynamic";

export default async function ReferralPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user } = await requireAuth(locale);
  if (!user) {
    return <LoginRequired next={`/${locale}/dashboard/referral`} />;
  }
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-white">
          Verv en venn
        </h2>
      </div>

      {/* Paper-bonus referral card — "Få en venn til å trade" */}
      <ReferralCard locale={locale} />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#2A2D35]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#0A0B0D] px-4 text-[#6B7280]">
            Flere måter å invitere på
          </span>
        </div>
      </div>

      {/* Golden Ticket section — eksisterende Master-tier referral */}
      <div>
        <h3 className="mb-4 text-xl font-bold text-white tracking-tight">
          The Golden Ticket
        </h3>
        <ReferralDashboard locale={locale} />
      </div>
    </div>
  );
}
