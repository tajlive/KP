"use client";

import { useAuth } from "@/components/auth/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { ScrollToTop } from "@/components/dashboard/ScrollToTop";
import { NotificationTray } from "@/components/layout/NotificationTray";
import { usePaperTradingInit } from "@/hooks/usePaperTradingInit";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  usePaperTradingInit(user?.id);
  
  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 flex">
        <ScrollToTop />
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <header className="absolute top-0 right-0 p-4 lg:p-8 z-10 flex items-center justify-end pointer-events-none">
            <div className="pointer-events-auto">
              <NotificationTray />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 lg:p-8 pt-20 lg:pt-24">
            <div className="max-w-6xl mx-auto">
              <DashboardContent>{children}</DashboardContent>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
