"use client";

import { useLocale } from "next-intl";
import { useState, useEffect } from "react";

export default function CookieConsent() {
  const locale = useLocale();
  const canonicalPath = (path: string) =>
    locale === "no" ? path : `/${locale}${path}`;
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShowBanner(false);
  };

  const declineCookies = () => {
    localStorage.setItem("cookie-consent", "declined");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 shadow-lg z-50">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm">
          Vi bruker informasjonskapsler for å forbedre din opplevelse. Les vår{" "}
          <a
            href={canonicalPath("/personvern")}
            className="underline hover:text-blue-300"
          >
            personvernerklæring
          </a>
          .
        </p>
        <div className="flex gap-2">
          <button
            onClick={acceptCookies}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm transition-colors"
          >
            Aksepter
          </button>
          <button
            onClick={declineCookies}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-sm transition-colors"
          >
            Avslå
          </button>
        </div>
      </div>
    </div>
  );
}
