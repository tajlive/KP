"use client";

import { useTranslations } from "next-intl";
import { getCookieConsent, type CookieConsentState } from "@/shared/ui/CookieConsent";
import { useState, useEffect } from "react";

export default function ClientCookies() {
  const t = useTranslations("legal.cookies");
  const [consent, setConsent] = useState<CookieConsentState | null>(null);

  useEffect(() => {
    setConsent(getCookieConsent());
    const handler = () => setConsent(getCookieConsent());
    window.addEventListener("cookie-consent-changed", handler);
    return () => window.removeEventListener("cookie-consent-changed", handler);
  }, []);

  const revoke = () => {
    localStorage.removeItem("cookie-consent-v2");
    setConsent(null);
    window.dispatchEvent(new CustomEvent("cookie-consent-changed", {
      detail: null,
    }));
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 py-16 pt-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold mb-8">{t("title")}</h1>

        <section>
          <h2 className="text-xl font-semibold mb-4">{t("whatAreCookies.title")}</h2>
          <p className="text-gray-600">{t("whatAreCookies.content")}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">{t("categories.title")}</h2>
          <div className="space-y-4">
            <CookieCategory
              name={t("categories.necessary.name")}
              description={t("categories.necessary.description")}
              examples={["session", "auth-token", "csrf"]}
            />
            <CookieCategory
              name={t("categories.analytics.name")}
              description={t("categories.analytics.description")}
              examples={["_ga", "_gid", "sentry-session"]}
            />
            <CookieCategory
              name={t("categories.marketing.name")}
              description={t("categories.marketing.description")}
              examples={["_fbp", "_gcl_au"]}
            />
            <CookieCategory
              name={t("categories.functional.name")}
              description={t("categories.functional.description")}
              examples={["locale", "theme", "feature-flags"]}
            />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">{t("thirdParty.title")}</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-600">
            <li><strong>Vercel Analytics:</strong> {t("thirdParty.vercel")}</li>
            <li><strong>Sentry:</strong> {t("thirdParty.sentry")}</li>
            <li><strong>Google Analytics:</strong> {t("thirdParty.google")}</li>
            <li><strong>Supabase:</strong> {t("thirdParty.supabase")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">{t("manage.title")}</h2>
          {consent ? (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-gray-600">
                {t("manage.lastUpdated")}: {new Date(consent.timestamp).toLocaleString()}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className={consent.analytics ? "text-green-600" : "text-gray-400"}>●</span>
                  Analytics: {consent.analytics ? "På" : "Av"}
                </div>
                <div className="flex items-center gap-2">
                  <span className={consent.marketing ? "text-green-600" : "text-gray-400"}>●</span>
                  Marketing: {consent.marketing ? "På" : "Av"}
                </div>
                <div className="flex items-center gap-2">
                  <span className={consent.functional ? "text-green-600" : "text-gray-400"}>●</span>
                  Functional: {consent.functional ? "På" : "Av"}
                </div>
              </div>
              <button
                onClick={revoke}
                className="text-sm underline text-red-600 hover:text-red-700"
              >
                {t("manage.revoke")}
              </button>
            </div>
          ) : (
            <p className="text-gray-600">{t("manage.noConsent")}</p>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">{t("contact.title")}</h2>
          <p className="text-gray-600">{t("contact.content")}</p>
        </section>
      </div>
    </div>
  );
}

function CookieCategory({
  name,
  description,
  examples,
}: {
  name: string;
  description: string;
  examples: string[];
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900">{name}</h3>
      <p className="text-gray-600 text-sm mt-1">{description}</p>
      <p className="text-gray-400 text-xs mt-2">
        Eksempler: {examples.join(", ")}
      </p>
    </div>
  );
}
