import { Metadata } from "next";
import { redirect } from "next/navigation";

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
  
  // Redirect til konsolidert profil-side med wallet-tab
  redirect(`/${locale}/profile?tab=wallet`);
}
