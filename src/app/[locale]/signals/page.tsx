import { requireAuth } from "@/lib/auth-guard";
import SignalTable from "@/components/SignalTable";

export const dynamic = "force-dynamic";

export default async function SignalsPage({
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
          Trading Signaler
        </h1>
        <SignalTable />
      </div>
    </div>
  );
}
