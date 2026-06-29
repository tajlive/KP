/**
 * Server layout wrapper for /dashboard/*.
 * Force dynamic so Supabase client is never created at build time (avoids
 * missing-env failures during prerender/build).
 */
export const dynamic = "force-dynamic";

import DashboardClientLayout from "./DashboardClientLayout";

export const runtime = 'nodejs';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
