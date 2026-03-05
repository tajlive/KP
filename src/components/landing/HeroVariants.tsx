"use client";

import { trackConversion, trackImpression, useABTest } from "@/lib/ab-testing";
import { ArrowRight, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HeroSection() {
  const t = useTranslations("landing.hero");
  const params = useParams();
  const router = useRouter();
  const locale = params?.locale as string;

  // A/B test: hero_copy_2026
  const variant = useABTest("hero_copy_2026");

  // Track impression on mount
  useEffect(() => {
    trackImpression("hero_copy_2026");
  }, []);

  const handleSignup = () => {
    trackConversion("hero_copy_2026", "signup_click");
    router.push(`/${locale}/signup`);
  };

  const handleDemo = () => {
    trackConversion("hero_copy_2026", "demo_click");
    // Scroll to demo section
    document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center max-w-4xl mx-auto">
          {/* Beta Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm font-semibold mb-8">
            <span className="animate-pulse">🔥</span>
            {t("beta_badge")}
          </div>

          {/* Main Headline - A/B Test */}
          {variant === "control" ? (
            // CONTROL: Original copy
            <>
              <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
                {t("title")}
              </h1>
              <p className="text-2xl md:text-3xl text-gray-700 dark:text-gray-300 font-bold mb-4">
                {t("subtitle")}
              </p>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
                {t("description")}
              </p>
            </>
          ) : (
            // VARIANT A: Emotional copy
            <>
              <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white mb-8 leading-tight">
                {t("title_emotional")}
              </h1>

              {/* Emotional hook */}
              <div className="bg-gradient-to-r from-blue-600 to-emerald-600 p-8 rounded-3xl mb-8">
                <p className="text-2xl md:text-3xl text-white font-bold mb-4 whitespace-pre-line">
                  {t("hook_emotional")}
                </p>
                <p className="text-xl text-blue-100">
                  {t("question_emotional")}
                </p>
              </div>

              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
                {t("description_emotional")}
              </p>
            </>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={handleSignup}
              className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              {t("cta_start")}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={handleDemo}
              className="px-8 py-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white font-bold text-lg rounded-xl hover:border-blue-600 dark:hover:border-blue-500 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              {t("cta_demo")}
            </button>
          </div>

          {/* Social Proof */}
          <div className="flex items-center justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-yellow-500">★★★★★</span>
              <span>{t("social_proof_rating")}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900 dark:text-white">
                348+
              </span>{" "}
              {t("social_proof_active")}
            </div>
          </div>

          {/* A/B Test Indicator (only in dev) */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-8 text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full inline-block">
              [A/B Test: {variant}]
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
