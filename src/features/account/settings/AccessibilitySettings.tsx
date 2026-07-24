"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

type ProfileA11yFields = {
  font_size_preference?: "normal" | "large";
  high_contrast_mode?: boolean;
};

export default function AccessibilitySettings() {
  const t = useTranslations("settings.accessibility");
  const [fontSize, setFontSize] = useState<"normal" | "large">("normal");
  const [highContrast, setHighContrast] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        // KLA-auth: browser-klienten er alltid anon — innstillinger hentes
        // og lagres via server-API som leser httpOnly auth-cookie
        const res = await fetch("/api/user/profile", {
          credentials: "same-origin",
        });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          const prefs = json?.profile as ProfileA11yFields | undefined;
          if (prefs) {
            setFontSize(prefs.font_size_preference || "normal");
            setHighContrast(prefs.high_contrast_mode || false);

            // Apply to document
            if (prefs.font_size_preference === "large") {
              document.documentElement.classList.add("text-lg");
            }
            if (prefs.high_contrast_mode) {
              document.documentElement.classList.add("high-contrast");
            }
          }
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function saveFontSize(size: "normal" | "large") {
    setFontSize(size);
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ font_size_preference: size }),
      });

      // Apply to document
      if (size === "large") {
        document.documentElement.classList.add("text-lg");
      } else {
        document.documentElement.classList.remove("text-lg");
      }
    } catch (error) {
      console.error("Failed to save font size:", error);
    }
  }

  async function saveHighContrast(enabled: boolean) {
    setHighContrast(enabled);
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ high_contrast_mode: enabled }),
      });

      // Apply to document
      if (enabled) {
        document.documentElement.classList.add("high-contrast");
      } else {
        document.documentElement.classList.remove("high-contrast");
      }
    } catch (error) {
      console.error("Failed to save high contrast:", error);
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4" />
        <div className="h-20 bg-gray-700 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-6">
        {t("title")}
      </h3>

      <div className="space-y-8">
        {/* Font size toggle */}
        <div role="group" aria-labelledby="a11y-font-size-label">
          <span
            id="a11y-font-size-label"
            className="block text-sm font-medium text-gray-300 mb-3"
          >
            {t("fontSize")}
          </span>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => saveFontSize("normal")}
              className={`min-h-[44px] min-w-[44px] px-6 py-3 rounded-lg font-semibold transition-colors ${
                fontSize === "normal"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {t("fontSizeNormal")}
            </button>
            <button
              onClick={() => saveFontSize("large")}
              className={`min-h-[44px] min-w-[44px] px-6 py-3 rounded-lg font-semibold transition-colors ${
                fontSize === "large"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {t("fontSizeLarge")}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {t("fontSizeHint")}
          </p>
        </div>

        {/* High contrast toggle */}
        <div>
          <label
            htmlFor="a11y-high-contrast"
            className="flex items-center justify-between cursor-pointer"
          >
            <div>
              <div className="font-medium text-white mb-1">{t("highContrast")}</div>
              <p className="text-sm text-gray-400">
                {t("highContrastDesc")}
              </p>
            </div>
            <button
              id="a11y-high-contrast"
              type="button"
              onClick={() => saveHighContrast(!highContrast)}
              aria-label={
                highContrast ? t("highContrastOff") : t("highContrastOn")
              }
              className={`min-h-[44px] min-w-[64px] relative rounded-full transition-colors ${
                highContrast ? "bg-green-600" : "bg-gray-600"
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-8 h-8 bg-white rounded-full transition-transform ${
                  highContrast ? "translate-x-8" : "translate-x-0"
                }`}
              />
            </button>
          </label>
        </div>

        {/* Preview */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <p className="text-lg mb-2 text-white">
            <strong>{t("previewTitle")}</strong> {t("previewText")}
          </p>
          <p className="text-base text-gray-300">
            {t("previewNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
