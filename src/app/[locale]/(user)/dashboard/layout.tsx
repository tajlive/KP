/**
 * Server layout wrapper for /dashboard/*.
 * Force dynamic so Supabase client is never created at build time (avoids
 * "Your project's URL and API key are required" during Vercel prerender).
 */
export const dynamic = "force-dynamic";

import DashboardClientLayout from "./DashboardClientLayout";

export const runtime = 'edge';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
