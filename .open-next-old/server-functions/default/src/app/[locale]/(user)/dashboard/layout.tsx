/**
 * Server layout wrapper for /dashboard/*.
 * Force dynamic so Supabase client is never created at build time (avoids
 * missing-env failures during prerender/build).
 *
 * Auth overlates til page.tsx (requireAuth) — layouten bare wrappper UI.
 * Cloudflare Workers kan ikke lese httpOnly auth-cookies i layout, så
 * initialUser sendes som null og AuthProvider resolver via client-side.
 */
export const dynamic = "force-dynamic";

import DashboardClientLayout from "./DashboardClientLayout";

export const runtime = 'nodejs';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const _params = await params;

  return (
    <DashboardClientLayout
      initialTradingMode="paper"
    >
      {children}
    </DashboardClientLayout>
  );
}

export { generateMetadata } from "./page";
