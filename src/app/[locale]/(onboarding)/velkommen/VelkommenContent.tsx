"use client";

import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import {
  GraduationCap,
  Target,
  Wallet,
  BookOpen,
  ArrowRight,
  Sparkles,
  Shield,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BRAND } from "@/lib/design/tokens";
import { hrefWithLocale } from "@/i18n/href-with-locale";

export function VelkommenContent() {
  const params = useParams();
  const locale = (params?.locale as string) || "no";
  const t = useTranslations("onboarding.welcomePage");

  const BETA_BENEFITS = [
    {
      icon: Wallet,
      title: t("benefits.items.paperMoney.title"),
      description: t("benefits.items.paperMoney.desc"),
    },
    {
      icon: BookOpen,
      title: t("benefits.items.journal.title"),
      description: t("benefits.items.journal.desc"),
    },
    {
      icon: Target,
      title: t("benefits.items.influence.title"),
      description: t("benefits.items.influence.desc"),
    },
    {
      icon: Sparkles,
      title: t("benefits.items.kltPoints.title"),
      description: t("benefits.items.kltPoints.desc"),
    },
  ];

  const WHAT_HAPPENS_NOW = [
    {
      step: "1",
      title: t("steps.items.checkStatus.title"),
      description: t("steps.items.checkStatus.desc"),
      action: t("steps.items.checkStatus.action"),
      href: "/LOCALE/login",
      primary: true,
    },
    {
      step: "2",
      title: t("steps.items.dashboard.title"),
      description: t("steps.items.dashboard.desc"),
      action: t("steps.items.dashboard.action"),
      href: "/LOCALE/dashboard",
      primary: false,
    },
    {
      step: "3",
      title: t("steps.items.wait.title"),
      description: t("steps.items.wait.desc"),
      action: null,
      href: null,
      primary: false,
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className={`inline-flex items-center justify-center w-20 h-20 ${BRAND.gradient} rounded-2xl mb-8 shadow-2xl shadow-brand-500/20`}>
            <GraduationCap className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            {t("hero.title")}{" "}
            <span className="bg-linear-to-r from-blue-400 via-emerald-400 to-pink-400 bg-clip-text text-transparent">
              {t("hero.highlight")}
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
            {t("hero.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className={`${BRAND.gradient} hover:opacity-90 text-lg px-8`}
              asChild
            >
              <a href={hrefWithLocale(locale, "/login")}>
                {t("steps.items.checkStatus.action")}
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
              asChild
            >
              <a href={`/${locale}/dashboard`}>{t("steps.items.dashboard.action")}</a>
            </Button>
          </div>
        </div>
      </section>

      {/* What happens now */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            {t("steps.title")}
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {WHAT_HAPPENS_NOW.map((item) => (
              <Card
                key={item.step}
                className="border-slate-700/50 bg-slate-800/30 backdrop-blur-sm relative overflow-hidden"
              >
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-linear-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center text-sm font-bold text-slate-400">
                  {item.step}
                </div>
                <CardHeader>
                  <CardTitle className="text-white text-lg">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                {item.action && (
                  <CardContent>
                    <Button
                      variant={item.primary ? "default" : "outline"}
                      size="sm"
                      className={
                        item.primary
                          ? BRAND.gradient
                          : "border-slate-600 text-slate-300 hover:bg-slate-700"
                      }
                      asChild
                    >
                      <a href={item.href!.replace("/LOCALE/", `/${locale}/`)}>
                        {item.action}
                        {item.primary && (
                          <ArrowRight className="w-4 h-4 ml-2" />
                        )}
                      </a>
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Beta benefits */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              {t("benefits.title")}
            </h2>
            <p className="text-slate-400">
              {t("benefits.subtitle")}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {BETA_BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <Card
                  key={benefit.title}
                  className="border-slate-700/50 bg-slate-800/30 backdrop-blur-sm"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-linear-to-br from-blue-500/10 to-emerald-500/10">
                        <Icon className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white mb-1">
                          {benefit.title}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Safety notice */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Shield className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-400 mb-2">
                    {t("safety.title")}
                  </h3>
                  <p className="text-amber-300/80 text-sm leading-relaxed">
                    {t("safety.desc")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            {t("cta.title")}
          </h2>
          <p className="text-slate-400 mb-8">
            {t("cta.subtitle")}
          </p>
          <Button
            size="lg"
            className={`${BRAND.gradient} hover:opacity-90 text-lg px-8`}
            asChild
          >
            <a href={hrefWithLocale(locale, "/login")}>
              {t("cta.button")}
              <ArrowRight className="w-5 h-5 ml-2" />
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center text-slate-500 text-sm">
          <p>
            {t("footer.questions")}{" "}
            <a
              href="mailto:support@klarpakke.no"
              className="text-blue-400 hover:text-blue-300"
            >
              support@klarpakke.no
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
