"use client";

import { Button } from "@/components/ui/button";
import {
  Award,
  BookOpen,
  CheckCircle,
  GraduationCap,
  Heart,
  Shield,
  Target,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

const values = [
  {
    icon: Shield,
    titleKey: "values.safety.title",
    descKey: "values.safety.desc",
  },
  {
    icon: GraduationCap,
    titleKey: "values.education.title",
    descKey: "values.education.desc",
  },
  {
    icon: Heart,
    titleKey: "values.community.title",
    descKey: "values.community.desc",
  },
  {
    icon: Target,
    titleKey: "values.transparency.title",
    descKey: "values.transparency.desc",
  },
];

const stats = [
  { value: "10,000+", labelKey: "stats.students" },
  { value: "50M+", labelKey: "stats.volume" },
  { value: "4.8/5", labelKey: "stats.rating" },
  { value: "24/7", labelKey: "stats.support" },
];

const differentiators = [
  "differentiators.paperTrading",
  "differentiators.norwegian",
  "differentiators.ai",
  "differentiators.gamification",
  "differentiators.realTime",
  "differentiators.community",
];

export default function OmOssClient() {
  const t = useTranslations("about");

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Hero */}
      <div className="bg-white border-b border-slate-100 pt-24 pb-16 text-center px-4">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold mb-6">
          <Award className="w-4 h-4" />
          {t("hero.badge")}
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
          {t("hero.title")}
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          {t("hero.subtitle")}
        </p>
      </div>

      {/* Mission */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">
              {t("mission.title")}
            </h2>
            <p className="text-lg text-slate-600 mb-6">{t("mission.p1")}</p>
            <p className="text-lg text-slate-600 mb-6">{t("mission.p2")}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/kurs">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <BookOpen className="w-4 h-4 mr-2" />
                  {t("mission.ctaCourses")}
                </Button>
              </Link>
              <Link href="/kontakt">
                <Button variant="outline">{t("mission.ctaContact")}</Button>
              </Link>
            </div>
          </div>
          <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
            <div className="relative z-10">
              <Users className="w-12 h-12 mb-6 text-blue-200" />
              <blockquote className="text-2xl font-medium italic mb-6">
                &ldquo;{t("mission.quote")}&rdquo;
              </blockquote>
              <p className="text-blue-100">{t("mission.quoteAuthor")}</p>
            </div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-600">{t(stat.labelKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            {t("values.title")}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t("values.subtitle")}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                <value.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{t(value.titleKey)}</h3>
              <p className="text-slate-600 text-sm">{t(value.descKey)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What Makes Us Different */}
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">{t("different.title")}</h2>
              <p className="text-lg text-slate-300 mb-8">
                {t("different.subtitle")}
              </p>
              <ul className="space-y-4">
                {differentiators.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-200">{t(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                    <Image
                      src="/logo.svg"
                      alt="Klarpakke"
                      width={48}
                      height={48}
                      className="invert"
                    />
                  </div>
                  <h3 className="text-2xl font-bold">{t("cta.title")}</h3>
                </div>
                <p className="text-slate-300 text-center mb-6">{t("cta.subtitle")}</p>
                <Link href="/innlogging">
                  <Button
                    size="lg"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {t("cta.button")}
                  </Button>
                </Link>
                <p className="text-slate-500 text-sm text-center mt-4">
                  {t("cta.noCard")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            {t("team.title")}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t("team.subtitle")}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {["founder", "cto", "headOfEducation"].map((role) => (
            <div
              key={role}
              className="bg-white p-6 rounded-2xl border border-slate-100 text-center"
            >
              <div className="w-24 h-24 bg-slate-200 rounded-full mx-auto mb-4 overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">
                {t(`team.${role}.name`)}
              </h3>
              <p className="text-blue-600 text-sm mb-2">
                {t(`team.${role}.role`)}
              </p>
              <p className="text-slate-600 text-sm">
                {t(`team.${role}.bio`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
