"use client";

import { getErrorMessage } from "@/lib/utils/error";

import { AlertCircle, CheckCircle, Loader2, Shield, Lock, CreditCard, Gift } from "lucide-react";
import { BRAND } from "@/lib/design/tokens";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";



function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("checkout");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<{
    id: string;
    title: string;
    description: string;
    price_nok: number;
  } | null>(null);
  const [success, setSuccess] = useState(false);

  const courseId = searchParams?.get("course");
  const sessionId = searchParams?.get("session_id");

  useEffect(() => {
    // If returning from Stripe with session_id, show success
    if (sessionId) {
      setSuccess(true);
      setLoading(false);
      return;
    }

    if (!courseId) {
      setError(t("noCourseSelected"));
      setLoading(false);
      return;
    }

    loadCourse();
  }, [courseId, sessionId]);

  async function loadCourse() {
    try {
      // KLA-auth: browser-klienten er alltid anon — kursdata hentes via
      // public server-API (kun publiserte felt)
      const res = await fetch(`/api/courses/${encodeURIComponent(courseId as string)}`);
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.course) {
        setError(t("courseNotFound"));
        return;
      }

      const data = json.course as {
        id: string;
        title: string | null;
        description: string | null;
        price_nok: number | null;
      };

      // courses table has no is_free column — check price_nok instead
      if (!data.price_nok || data.price_nok <= 0) {
        setError(t("courseIsFree"));
        return;
      }

      setCourse({
        id: data.id,
        title: data.title ?? "",
        description: data.description ?? "",
        price_nok: data.price_nok ?? 0,
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      // Create checkout session
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course?.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-md w-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 dark:text-green-200 mb-2">
            {t("successTitle")}
          </h2>
          <p className="text-green-700 dark:text-green-300 mb-6">
            {t("successMessage")}
          </p>
          <button
            onClick={() => router.push("/dashboard", { scroll: false })}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all"
          >
            {t("goToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-900 dark:text-red-200 mb-2">
            {t("error")}
          </h2>
          <p className="text-red-700 dark:text-red-300 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all"
          >
            {t("goBack")}
          </button>
        </div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t("title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {t("subtitle")}
          </p>

          {/* Course Summary */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {course!.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {course.description}
            </p>
            <div className="flex items-baseline justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {t("total")}
              </span>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {course?.price_nok} kr
              </span>
            </div>
          </div>

          {/* KLA-88: Trust Signals */}
          <div className="mb-6 p-4 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-200 text-sm">
                  Hvorfor kan du stole på oss?
                </p>
                <ul className="mt-2 space-y-1 text-xs text-blue-700 dark:text-blue-300">
                  <li className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    API-nøkler lagres kryptert med AES-256
                  </li>
                  <li className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Du beholder alltid midlene dine på børsen
                  </li>
                  <li className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Vi håndterer aldri dine private nøkler
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Gratis for alltid info */}
          <div className="mb-6 p-4 bg-linear-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
            <div className="flex items-start gap-3">
              <Gift className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900 dark:text-emerald-200 text-sm">
                  Gratis for alltid med lekepenger
                </p>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                  Du kan alltid gå tilbake til gratis lekepenger hvis du ombestemmer deg. 
                  Ingen skjulte gebyrer, ingen binding.
                </p>
              </div>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 ${BRAND.gradient} hover:opacity-90 text-white rounded-xl font-semibold transition-all shadow-lg shadow-brand-500/30 disabled:opacity-50`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("processing")}
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                {t("proceedToPayment")}
              </>
            )}
          </button>

          {/* Sikkerhetsbadges */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>256-bit SSL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>PCI-DSS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Stripe</span>
            </div>
          </div>

          {/* Betalingsmetoder */}
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400 dark:text-gray-500">
            <span>💳 Kort</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>📱 Vipps</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>🔒 Trygg betaling</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientCheckout() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
