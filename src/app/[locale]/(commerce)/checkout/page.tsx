import { redirect } from "next/navigation";
import type { Metadata } from "next";
import ClientCheckout from "./ClientCheckout";
import PlanCheckout from "./CheckoutContent";

export const metadata: Metadata = {
  title: "Checkout | Klarpakke",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string; course?: string; session_id?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const hasPlan = Boolean(sp?.plan);
  const hasCourse = Boolean(sp?.course);
  const hasSessionId = Boolean(sp?.session_id);

  if (hasPlan) {
    return <PlanCheckout />;
  }
  if (hasCourse || hasSessionId) {
    return <ClientCheckout />;
  }
  redirect(`/${locale}/priser`);
}
