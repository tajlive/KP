"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

const APP_ROUTES = ["/dashboard", "/admin", "/paper-trading"];

function InlineFooter() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <footer className="bg-slate-950 border-t border-white/5 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">Klarpakke</span>
            <span className="text-white/60 text-sm">|</span>
            <span className="text-white/60 text-sm">Norges enkleste krypto-trading</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Link href="/vilkar" className="hover:text-white transition-colors py-3 px-2 min-h-[48px] flex items-center">Vilkår</Link>
            <Link href="/personvern" className="hover:text-white transition-colors py-3 px-2 min-h-[48px] flex items-center">Personvern</Link>
            <Link href="/kontakt" className="hover:text-white transition-colors py-3 px-2 min-h-[48px] flex items-center">Kontakt</Link>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Klarpakke AS. Org.no: 929003292 MVA.
          <span className="mx-2">·</span>
          <span suppressHydrationWarning className="text-white/50" title="Sist oppdatert">{mounted ? new Date().toLocaleDateString('no-NO') : '—'}</span>
        </div>
      </div>
    </footer>
  );
}

export function ConditionalFooter() {
  const pathname = usePathname();

  const isAppRoute = APP_ROUTES.some((route) =>
    (pathname ?? "/").includes(route),
  );
  if (isAppRoute) return null;

  return <InlineFooter />;
}
