"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const APP_ROUTES = ["/dashboard", "/admin", "/paper-trading"];

function InlineFooter() {
  return (
    <footer className="bg-slate-950 border-t border-white/5 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">Klarpakke</span>
            <span className="text-white/40 text-sm">|</span>
            <span className="text-white/40 text-sm">Norges enkleste krypto-trading</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/50">
            <Link href="/vilkar" className="hover:text-white transition-colors">Vilkår</Link>
            <Link href="/personvern" className="hover:text-white transition-colors">Personvern</Link>
            <Link href="/kontakt" className="hover:text-white transition-colors">Kontakt</Link>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-white/30">
          © {new Date().getFullYear()} Klarpakke AS. Org.no: 929003292 MVA.
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
