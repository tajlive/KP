/**
 * Deployment Admin Page
 * 
 * Visual interface for production deployments.
 * Shows deployment status, health checks, and notifications.
 * 
 * Security: Admin-only access required
 */

import { Metadata } from "next";
import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { AccessDenied } from "@/shared/ui/AccessDenied";
import { createServerClient } from "@/lib/supabase/server";
import { DeployDashboard } from "./DeployDashboard";

export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Deployment Admin - Klarpakke",
    robots: { index: false, follow: false },
  };
}

// Admin check
async function checkAdminAccess() {
  const supabase = await createServerClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }
    
    // Check if user has admin tier
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("tier")
      .eq("id", user.id)
      .single();
    
    // Note: Adjust admin check based on your actual admin logic
    // This checks for highest tier as proxy for admin access
    return profile?.tier === "professor";
  } catch {
    return false;
  }
}

export default async function DeployAdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { user } = await requireAuth(locale);
  if (!user) {
    return <LoginRequired next={`/${locale}/admin/deploy`} />;
  }

  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return <AccessDenied next={`/${locale}/admin/deploy`} />;
  }

  return <DeployDashboard />;
}
