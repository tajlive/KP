"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useEffect } from "react";

export interface CookieConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  timestamp: string;
}

const CONSENT_KEY = "cookie-consent-v2";

export function getCookieConsent(): CookieConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookieConsentState;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  return getCookieConsent()?.analytics ?? false;
}

export function hasMarketingConsent(): boolean {
  return getCookieConsent()?.marketing ?? false;
}

export function hasFunctionalConsent(): boolean {
  return getCookieConsent()?.functional ?? false;
}

export default function CookieConsent() {
  const locale = useLocale();
  const t = useTranslations("cookieConsent");
  const canonicalPath = (path: string) =>
    locale === "no" ? path : `/${locale}${path}`;

  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<CookieConsentState>({
    necessary: true,
    analytics: false,
    marketing: false,
    functional: false,
    timestamp: new Date().toISOString(),
  });

  useEffect(() => {
    const saved = getCookieConsent();
    if (!saved) {
      setShowBanner(true);
    }
  }, []);

  const saveConsent = (next: CookieConsentState) => {
    const withTimestamp = { ...next, timestamp: new Date().toISOString() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(withTimestamp));
    setConsent(withTimestamp);
    setShowBanner(false);
    // Dispatch event so trackers can react immediately
    window.dispatchEvent(new CustomEvent("cookie-consent-changed", {
      detail: withTimestamp,
    }));
  };

  const acceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
      timestamp: "",
    });
  };

  const acceptSelected = () => {
    saveConsent(consent);
  };

  const declineAll = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
      timestamp: "",
    });
  };

  const toggle = (key: keyof Omit<CookieConsentState, "timestamp">) => {
    setConsent((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 shadow-lg z-50">
      <div className="container mx-auto max-w-4xl">
        {!showDetails ? (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">
              {t("bannerText")}{" "}
              <a
                href={canonicalPath("/personvern")}
                className="underline hover:text-blue-300"
              >
                {t("privacyLink")}
              </a>{" "}
              {t("and")}{" "}
              <a
                href={canonicalPath("/cookies")}
                className="underline hover:text-blue-300"
              >
                {t("cookieLink")}
              </a>
              .
            </p>
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                onClick={() => setShowDetails(true)}
                className="text-sm underline hover:text-blue-300 px-3 py-2"
              >
                {t("customize")}
              </button>
              <button
                onClick={declineAll}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-sm transition-colors"
              >
                {t("decline")}
              </button>
              <button
                onClick={acceptAll}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm transition-colors"
              >
                {t("acceptAll")}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t("preferencesTitle")}</h3>
            <div className="space-y-3">
              <CategoryRow
                label={t("necessary.label")}
                description={t("necessary.description")}
                checked={consent.necessary}
                required
                onChange={() => {}}
              />
              <CategoryRow
                label={t("analytics.label")}
                description={t("analytics.description")}
                checked={consent.analytics}
                onChange={() => toggle("analytics")}
              />
              <CategoryRow
                label={t("marketing.label")}
                description={t("marketing.description")}
                checked={consent.marketing}
                onChange={() => toggle("marketing")}
              />
              <CategoryRow
                label={t("functional.label")}
                description={t("functional.description")}
                checked={consent.functional}
                onChange={() => toggle("functional")}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowDetails(false)}
                className="text-sm underline hover:text-blue-300 px-3 py-2"
              >
                {t("back")}
              </button>
              <button
                onClick={acceptSelected}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm transition-colors"
              >
                {t("savePreferences")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryRow({
  label,
  description,
  checked,
  required,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  required?: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start gap-3 bg-gray-800/50 rounded-lg p-3">
      <input
        type="checkbox"
        checked={checked}
        disabled={required}
        onChange={onChange}
        className="mt-1 w-4 h-4 accent-blue-600 disabled:opacity-50"
      />
      <div>
        <p className="font-medium text-sm">
          {label}
          {required && (
            <span className="ml-2 text-xs text-gray-400">(påkrevd)</span>
          )}
        </p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    </div>
  );
}
