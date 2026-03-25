import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LommebokDashboard } from "./LommebokDashboard";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { BRAND } from "@/lib/design/tokens";

export const metadata: Metadata = {
  title: "Lommebok - Klarpakke Universitet",
  description: "Din personlige lommebok for krypto-trading",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: string }>;
}

// Fallback UI for når autentisering eller datahenting feiler
function KontoErrorFallback({ locale }: { locale: string }) {
  return (
    <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-red-900/20 border border-red-700/50 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-200 mb-2">
          Kunne ikke laste lommebok
        </h2>
        <p className="text-red-300/80 mb-4">
          Det oppstod en feil ved lasting av din lommebok. Vennligst prøv igjen.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href={`/${locale}/konto`}
            className={`px-4 py-2 ${BRAND.primary} rounded-lg transition-colors`}
          >
            Last inn på nytt
          </Link>
          <Link
            href={`/${locale}/dashboard`}
            className={`px-4 py-2 ${BRAND.secondary} rounded-lg transition-colors`}
          >
            Tilbake til dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function LommebokPage({ params }: PageProps) {
  const { locale } = await params;

  try {
    // Hent autentisert bruker
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect(`/${locale}/innlogging?redirectTo=/${locale}/konto`);
    }

    return <LommebokDashboard />;
  } catch (error) {
    // Preserve Next.js redirect behavior; redirect() throws internally.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Konto page error:", error);
    // Return fallback UI istedenfor å krasje
    return <KontoErrorFallback locale={locale} />;
  }
}
