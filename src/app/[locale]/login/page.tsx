import { requireGuest } from "@/lib/auth-guard";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireGuest(locale);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-8">
          <h1 className="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-white">
            Logg inn
          </h1>
          <p className="text-center text-slate-500 dark:text-slate-400 mb-6">
            Velkommen tilbake til Klarpakke
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
