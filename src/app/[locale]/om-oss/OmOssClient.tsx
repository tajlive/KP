"use client";

import { Button } from "@/components/ui/button";
import {
  Award,
  BookOpen,
  CheckCircle,
  GraduationCap,
  Heart,
  Mail,
  MapPin,
  Shield,
  Target,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

const values = [
  {
    icon: GraduationCap,
    titleKey: "values.education.title",
    descKey: "values.education.desc",
  },
  {
    icon: Target,
    titleKey: "values.transparency.title",
    descKey: "values.transparency.desc",
  },
  {
    icon: Shield,
    titleKey: "values.safety.title",
    descKey: "values.safety.desc",
  },
  {
    icon: Heart,
    titleKey: "values.community.title",
    descKey: "values.community.desc",
  },
];

const stats = [
  { value: "10,000+", labelKey: "stats.students" },
  { value: "50M+", labelKey: "stats.volume" },
  { value: "4.8/5", labelKey: "stats.rating" },
  { value: "24/7", labelKey: "stats.support" },
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

      {/* Tom's Story - The Foundation */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">
              {t("story.title")}
            </h2>
            <div className="space-y-4 text-lg text-slate-600">
              <p>{t("story.p1")}</p>
              <p>{t("story.p2")}</p>
              <p>{t("story.p3")}</p>
            </div>
            <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-blue-900 font-medium italic">
                &ldquo;{t("story.quote")}&rdquo;
              </p>
              <p className="text-blue-600 mt-2">— {t("story.quoteAuthor")}</p>
            </div>
          </div>
          <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{t("mission.title")}</h3>
              <p className="text-slate-300">{t("mission.text")}</p>
              <div className="mt-6 flex gap-3">
                <Link href="/kurs">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <BookOpen className="w-4 h-4 mr-2" />
                    {t("mission.ctaCourses")}
                  </Button>
                </Link>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl" />
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

      {/* What Makes Us Different - No Hype, Just Facts */}
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">{t("different.title")}</h2>
              <p className="text-lg text-slate-300 mb-8">
                {t("different.subtitle")}
              </p>
              <ul className="space-y-4">
                {[
                  "different.paperTrading",
                  "different.norwegian",
                  "different.education",
                  "different.transparency",
                  "different.community",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-200">{t(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700">
              <h3 className="text-xl font-bold mb-4 text-center">{t("risk.title")}</h3>
              <p className="text-slate-300 text-center mb-6">{t("risk.text")}</p>
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-300 text-sm text-center font-medium">
                  ⚠️ {t("risk.warning")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            {t("contact.title")}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t("contact.subtitle")}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mx-auto mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">{t("contact.email")}</h3>
            <a href="mailto:support@klarpakke.no" className="text-blue-600 hover:underline">
              support@klarpakke.no
            </a>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mx-auto mb-4">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">{t("contact.org")}</h3>
            <p className="text-slate-600">929 003 292</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mx-auto mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">{t("contact.community")}</h3>
            <p className="text-slate-600">Discord & Forum</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
          <p className="text-xl text-blue-100 mb-8">{t("cta.subtitle")}</p>
          <Link href="/innlogging">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
            >
              {t("cta.button")}
            </Button>
          </Link>
          <p className="text-blue-200 text-sm mt-4">{t("cta.noCard")}</p>
        </div>
      </div>
    </div>
  );
}
