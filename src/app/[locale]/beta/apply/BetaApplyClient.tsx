"use client";

import { createClient } from "@/lib/utils";
import { CheckCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function BetaApplyClient({
  params,
}: {
  params: { locale: string };
}) {
  const t = useTranslations("beta");
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    tradingExperience: "",
    motivation: "",
    riskTolerance: "moderate" as "conservative" | "moderate" | "aggressive",
  });

  const checkExistingApplication = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const locale = (pathname ?? "/no").split("/")[1] || "no";
      const supportedLocales = ["no", "en", "th", "zh"];
      const safeLocale = supportedLocales.includes(locale) ? locale : "no";
      router.push(
        `/${safeLocale}/innlogging?next=${encodeURIComponent(pathname ?? "/")}`,
      );
      return;
    }

    const { data: profile } = await supabase
      .from("user_profiles" as any)
      .select("beta_access")
      .eq("id", user.id)
      .single() as any;

    if (profile?.beta_access) {
      router.push(`/${params.locale}/dashboard`, { scroll: false });
      return;
    }

    const { data: application } = await supabase
      .from("beta_applications")
      .select("*")
      .eq("user_id" as any, user.id)
      .single() as any;

    if (application) {
      setHasApplied(true);
    }

    setLoading(false);
  }, [supabase, pathname, router, params.locale]);

  useEffect(() => {
    checkExistingApplication();
  }, [checkExistingApplication]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("beta_applications").insert({
        user_id: user.id,
        trading_experience: formData.tradingExperience,
        motivation: formData.motivation,
        risk_tolerance: formData.riskTolerance,
        application_status: "pending",
      });

      if (error) throw error;

      // AUTO-APPROVE for beta testing phase
      await supabase
        .from("user_profiles" as any)
        .update({
          beta_access: true,
          beta_approved_at: new Date().toISOString(),
          subscription_tier: "beta",
          subscription_status: "active",
        })
        .eq("id", user.id);

      await supabase
        .from("beta_applications")
        .update({
          application_status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("user_id" as any, user.id);

      setSubmitted(true);

      // Redirect etter 2 sekunder
      setTimeout(() => {
        router.push(
          `/${params.locale}/beta/apply/takk?status=approved&email=${encodeURIComponent(user.email || "")}`,
        );
      }, 2000);
    } catch (error: unknown) {
      console.error("Application error:", error);
      toast.error(t("applicationError"));
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>{t("loading")}</span>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{t("success")}</h2>
          <p className="text-slate-400">{t("redirecting")}</p>
        </div>
      </div>
    );
  }

  if (hasApplied) {
    return (
      <div className="min-h-screen bg-slate-950 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h1 className="text-3xl font-bold text-white mb-4">
              {t("applicationPending")}
            </h1>
            <p className="text-slate-400 mb-8">{t("applicationPendingDesc")}</p>
            <button
              onClick={() =>
                router.push(`/${params.locale}/dashboard`, { scroll: false })
              }
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              {t("backToDashboard")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium mb-4">
              <span>BETA</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {t("applyForBeta")}
            </h1>
            <p className="text-slate-400">{t("applyForBetaDesc")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t("tradingExperience")}
              </label>
              <textarea
                value={formData.tradingExperience}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tradingExperience: e.target.value,
                  })
                }
                required
                rows={4}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder={t("tradingExperiencePlaceholder")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t("motivation")}
              </label>
              <textarea
                value={formData.motivation}
                onChange={(e) =>
                  setFormData({ ...formData, motivation: e.target.value })
                }
                required
                rows={4}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder={t("motivationPlaceholder")}
              />
            </div>

            <div>
              <label
                htmlFor="riskTolerance"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                {t("riskTolerance")}
              </label>
              <select
                id="riskTolerance"
                title={t("riskTolerance")}
                value={formData.riskTolerance}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    riskTolerance: e.target.value as
                      | "conservative"
                      | "moderate"
                      | "aggressive",
                  })
                }
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="conservative">{t("riskConservative")}</option>
                <option value="moderate">{t("riskModerate")}</option>
                <option value="aggressive">{t("riskAggressive")}</option>
              </select>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <p className="text-sm text-yellow-200">
                <strong>{t("betaWarning")}:</strong> {t("betaWarningText")}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t("submitting")}
                </span>
              ) : (
                t("submitApplication")
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
