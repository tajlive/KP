"use client";

import { createClient } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Sjekk auth umiddelbart
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });

    // Lytt til auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Redirect ETTER vi vet auth status
  useEffect(() => {
    if (
      isAuthenticated === false &&
      !(pathname ?? "/").includes("/auth/callback")
    ) {
      const locale = (pathname ?? "/").startsWith("/en") ? "en" : "no";
      router.push(
        `/${locale}/innlogging?redirectTo=${encodeURIComponent(pathname ?? "/")}`,
      );
    }
  }, [isAuthenticated, pathname, router]);

  // Mens vi laster: vis fallback
  if (isAuthenticated === null) {
    return fallback || <div>Loading...</div>;
  }

  // Ikke autentisert: vis ingenting (redirect skjer i useEffect)
  if (!isAuthenticated) {
    return null;
  }

  // Autentisert: vis children
  return <>{children}</>;
}
