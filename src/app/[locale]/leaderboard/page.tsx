import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAuth(locale);
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
          Leaderboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Kommer snart — sammenlign dine resultater med andre tradere.
        </p>
      </div>
    </div>
  );
}
