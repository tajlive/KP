"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@supabase/supabase-js";
import {
  DollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useLocale } from "next-intl";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Studenter", href: "/admin/students", icon: Users },
  { name: "Monetization", href: "/admin/monetization", icon: DollarSign },
  { name: "System", href: "/admin/system", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string; role?: string } | null>(
    null,
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/${locale}/admin/login`);
        return;
      }

      // Sjekk om bruker er admin
      const { data: adminUser, error } = await supabase
        .from("admin_users")
        .select<"*", { role: string }>("*")
        .eq("id", user.id)
        .single();

      if (error || adminUser?.role !== "admin") {
        await supabase.auth.signOut();
        router.push(`/${locale}/admin/login`);
        return;
      }

      setUser({ ...user, ...adminUser });
      setLoading(false);
    } catch (error) {
      console.error("Auth check error:", error);
      router.push(`/${locale}/admin/login`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}/admin/login`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/favicon.png" alt="Logo" width={24} height={24} />
          <span className="font-bold text-white">Klarpakke Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-slate-400 hover:text-white"
        >
          {sidebarOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      <div className="flex h-screen pt-14 lg:pt-0">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform lg:transform-none ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <Image src="/favicon.png" alt="Logo" width={40} height={40} />
              <div>
                <h1 className="font-bold text-white">Klarpakke</h1>
                <p className="text-xs text-slate-400">Admin Portal</p>
              </div>
            </div>

            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-600/10 text-blue-400"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </a>
                );
              })}
            </nav>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm">
                <p className="text-white font-medium">{user?.email}</p>
                <p className="text-slate-400 text-xs">Administrator</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logg ut
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8">{children}</div>
        </main>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
