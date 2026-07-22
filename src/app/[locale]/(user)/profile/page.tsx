export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { ProfilePageClient } from "./ProfilePageClient";

export const runtime = 'nodejs';

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

  return <ProfilePageClient key={locale} initialTab={tab} />;
}
