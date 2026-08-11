"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NotFoundClient() {
  const pathname = usePathname() || "/no/";
  const localeMatch = pathname.match(/^\/(no|en|th|zh)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : "no";
  const isEn = locale === "en";

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
      <div className="text-center space-y-8 p-8 max-w-lg">
        {/* 404 Icon */}
        <div className="relative">
          <div className="text-9xl font-black text-slate-200 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl" role="img" aria-label="Confused face">
              🤔
            </span>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">
            {isEn ? "Oops! Page not found" : "Oops! Siden finnes ikke"}
          </h1>
          <p className="text-slate-600 leading-relaxed">
            {isEn
              ? "The page you are looking for has been moved, deleted, or never existed. Don't worry — we'll help you find your way!"
              : "Siden du leter etter har blitt flyttet, slettet, eller eksisterte aldri. Ikke bekymre deg – vi hjelper deg videre!"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {isEn ? "Go to front page" : "Gå til forsiden"}
          </Link>
          <Link
            href={`/${locale}/login`}
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 font-medium rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
            {isEn ? "Log in" : "Logg inn"}
          </Link>
        </div>

        {/* Help Links */}
        <div className="pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            {isEn ? "Need help?" : "Trenger du hjelp?"}{" "}
            <Link
              href={`/${locale}/kontakt`}
              className="text-blue-600 hover:underline"
            >
              {isEn ? "Contact us" : "Kontakt oss"}
            </Link>{" "}
            {isEn ? "or" : "eller"}{" "}
            <Link
              href={`/${locale}/hjelp`}
              className="text-blue-600 hover:underline"
            >
              {isEn ? "visit our help center" : "se vår hjelpesenter"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
