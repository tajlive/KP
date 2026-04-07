export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { ProfilePageClient } from "./ProfilePageClient";

export const metadata: Metadata = {
  title: "Profil - Klarpakke",
  description: "Din profil, lommebok og innstillinger",
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

export default async function ProfilePage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const tab = (await searchParams)?.tab;

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect(`/${locale}/innlogging?redirectTo=/${locale}/profile`);
    }

    return <ProfilePageClient initialTab={tab} />;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Profile page error:", error);
    redirect(`/${locale}/innlogging?redirectTo=/${locale}/profile`);
  }
}
