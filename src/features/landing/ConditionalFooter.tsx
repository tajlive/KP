"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const APP_ROUTES = ["/dashboard", "/admin", "/handel"];

function InlineFooter() {
  const [mounted, setMounted] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const t = useTranslations("footer");
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          const data = await res.json();
          if (data.version && data.version !== "unknown" && /^[0-9a-f]{7,40}$/i.test(data.version)) {
            setVersion(data.version);
          }
          if (data.timestamp) {
            const d = new Date(data.timestamp);
            setLastUpdated(d.toLocaleDateString("no-NO", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }));
          }
        }
      } catch {
        // silent — fallback to mount date
      }
    }
    fetchHealth();
  }, []);

  return (
    <footer className="bg-slate-950 border-t border-white/5 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">Klarpakke</span>
            <span className="text-white/60 text-sm">|</span>
            <span className="text-white/60 text-sm">{t("brandTagline")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Link href="/vilkar" prefetch={false} className="hover:text-white transition-colors py-3 px-2 min-h-[48px] flex items-center">{t("links.terms")}</Link>
            <Link href="/personvern" prefetch={false} className="hover:text-white transition-colors py-3 px-2 min-h-[48px] flex items-center">{t("links.privacy")}</Link>
            <Link href="/kontakt" prefetch={false} className="hover:text-white transition-colors py-3 px-2 min-h-[48px] flex items-center">{t("links.contact")}</Link>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Klarpakke Project.
          <span className="mx-2">·</span>
          <span suppressHydrationWarning className="text-white/50" title="Sist oppdatert">
            {mounted
              ? lastUpdated
                ? lastUpdated
                : new Date().toLocaleDateString("no-NO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
              : "—"}
          </span>
          {version && (
            <>
              <span className="mx-2">·</span>
              <span className="text-white/40 font-mono tracking-tight">{version}</span>
            </>
          )}
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
