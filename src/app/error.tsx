"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const pathname = usePathname();
  const localeMatch = pathname?.match(/^\/(no|en|th|zh)\//);
  const locale = localeMatch ? localeMatch[1] : "no";
  const isEn = locale === "en";

  useEffect(() => {
    if (error == null) return;
    const msg = error?.message ?? String(error);
    const digest = error?.digest;
    const stack = error?.stack;
    console.error("Application error:", {
      message: msg,
      digest,
      stack,
      timestamp: new Date().toISOString(),
    });

    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "production"
    ) {
      fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reports: [
            {
              type: "error",
              level: "error",
              message: msg,
              digest,
              stack,
              url: window.location.href,
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      }).catch(() => {});
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-red-50 to-orange-50">
      <div className="text-center space-y-8 p-8 max-w-lg">
        <div className="relative">
          <div className="text-8xl font-black text-red-100 select-none">500</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl" role="img" aria-label="Broken computer">
              💥
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">
            {isEn ? "Something went wrong" : "Noe gikk galt"}
          </h1>
          <p className="text-slate-600 leading-relaxed">
            {isEn
              ? "Sorry, we encountered a technical error. Our team has been notified and is working to fix the problem."
              : "Beklager, men vi opplevde en teknisk feil. Vårt team har blitt varslet og jobber med å løse problemet."}
          </p>
          {error?.digest && (
            <p className="text-xs text-slate-400 font-mono">
              {isEn ? "Error code" : "Feilkode"}: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {isEn ? "Try again" : "Prøv igjen"}
          </button>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-slate-700 font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
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
            {isEn ? "Go to front page" : "Til forsiden"}
          </Link>
        </div>

        <div className="pt-6 border-t border-red-100">
          <p className="text-sm text-slate-500">
            {isEn ? "Still having issues?" : "Problemet vedvarer?"}{" "}
            <Link
              href={`/${locale}/kontakt`}
              className="text-blue-600 hover:underline"
            >
              {isEn ? "Contact support" : "Kontakt kundestøtte"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
