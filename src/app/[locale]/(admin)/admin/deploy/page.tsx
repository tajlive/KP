/**
 * Deployment Admin Page
 * 
 * Visual interface for production deployments.
 * Shows deployment status, health checks, and notifications.
 * 
 * Security: Admin-only access required
 */

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { DeployDashboard } from "./DeployDashboard";

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
  const isAdmin = await checkAdminAccess();

  if (!isAdmin) {
    redirect(`/${locale}/login?next=/${locale}/admin/deploy`);
  }
  
  return <DeployDashboard />;
}
