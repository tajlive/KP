import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { LommebokDashboard } from "./LommebokDashboard";

export const metadata: Metadata = {
  title: "Lommebok - Klarpakke Universitet",
  description: "Din personlige lommebok for krypto-trading",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function LommebokPage({ params }: PageProps) {
  const { locale } = await params;

  try {
    // Hent autentisert bruker
    const supabase = await createServerClient();
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
    // Fail closed on auth/session fetch errors to avoid trapping users
    // behind an unrecoverable wallet fallback page.
    redirect(`/${locale}/innlogging?redirectTo=/${locale}/konto`);
  }
}
