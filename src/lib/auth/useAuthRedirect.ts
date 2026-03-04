"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/utils";

const SUPPORTED_LOCALES = ['no', 'en', 'th', 'zh'];

/**
 * Henter locale fra pathname (alltid pålitelig, ikke avhengig av useLocale)
 */
export function getLocaleFromPathname(pathname: string): string {
  const locale = pathname.split('/')[1];
  return SUPPORTED_LOCALES.includes(locale) ? locale : 'no';
}

/**
 * Hook for client-side auth check med korrekt redirect
 * 
 * Bruk: const { user, loading } = useAuthRedirect();
 * 
 * Denne hooken:
 * 1. Sjekker auth status
 * 2. Redirecter til login med ?next= parameter hvis ikke autentisert
 * 3. Bruker pathname for å hente locale (ikke useLocale som er buggy)
 */
export function useAuthRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Hent locale fra pathname (alltid pålitelig)
        const locale = getLocaleFromPathname(pathname);
        
        // Sett ?next= slik at bruker kommer tilbake etter login
        const encodedNext = encodeURIComponent(pathname);
        router.push(`/${locale}/innlogging?next=${encodedNext}`);
        return;
      }
      
      setUser(user);
      setLoading(false);
    }
    
    checkAuth();
  }, [router, pathname]);

  return { user, loading };
}

/**
 * Hjelpefunksjon for manuell redirect til login
 */
export function redirectToLogin(router: { push: (url: string) => void }, pathname: string) {
  const locale = getLocaleFromPathname(pathname);
  const encodedNext = encodeURIComponent(pathname);
  router.push(`/${locale}/innlogging?next=${encodedNext}`);
}
