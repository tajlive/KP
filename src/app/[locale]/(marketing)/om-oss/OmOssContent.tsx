import { Button } from "@/shared/ui/button";
import {
  Award,
  BookOpen,
  CheckCircle,
  GraduationCap,
  Mail,
  MapPin,
  Search,
  AlertTriangle,
  Flag,
  Landmark,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

const values = [
  {
    icon: GraduationCap,
    titleKey: "values.education.title",
    descKey: "values.education.desc",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: Search,
    titleKey: "values.transparency.title",
    descKey: "values.transparency.desc",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    icon: Flag,
    titleKey: "values.norwegian.title",
    descKey: "values.norwegian.desc",
    color: "bg-red-100 text-red-600",
  },
  {
    icon: AlertTriangle,
    titleKey: "values.risk.title",
    descKey: "values.risk.desc",
    color: "bg-amber-100 text-amber-600",
  },
];

export async function OmOssContent({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "about" });

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Award className="w-4 h-4" />
            {t("hero.badge")}
          </div>
          <h1 className="font-fraunces text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            {t("hero.title")}
          </h1>
          <p className="font-lexend text-xl text-slate-600 max-w-2xl mx-auto">
            {t("hero.subtitle")}
          </p>
        </div>

        {/* Story Section */}
        <section className="mb-16">
          <h2 className="font-fraunces text-3xl font-bold text-slate-900 mb-6">
            {t("story.title")}
          </h2>
          <div className="prose prose-lg">
            <p className="font-lexend text-slate-700 mb-4">
              {t("story.p1")}
            </p>
            <p className="font-lexend text-slate-700 mb-4">
              {t("story.p2")}
            </p>
            <p className="font-lexend text-slate-700 mb-4">
              {t("story.p3")}
            </p>
          </div>
          <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
            <p className="font-lexend text-blue-900 font-medium italic">
              &ldquo;{t("story.quote")}&rdquo;
            </p>
            <p className="font-lexend text-blue-600 mt-2">— {t("story.quoteAuthor")}</p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="mb-16 bg-blue-50 rounded-2xl p-8">
          <h2 className="font-fraunces text-3xl font-bold text-slate-900 mb-4">
            {t("mission.title")}
          </h2>
          <p className="font-lexend text-lg text-slate-700 mb-4">
            {t("mission.text")}
          </p>
          <p className="font-lexend text-slate-600">
            {t("mission.values")}
          </p>
        </section>

        {/* Values Section */}
        <section className="mb-16">
          <h2 className="font-fraunces text-3xl font-bold text-slate-900 mb-8 text-center">
            {t("values.title")}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${value.color}`}>
                  <value.icon className="w-6 h-6" />
                </div>
                <h3 className="font-fraunces text-xl font-bold text-slate-900 mb-3">
                  {t(value.titleKey)}
                </h3>
                <p className="font-lexend text-slate-600">
                  {t(value.descKey)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* What Makes Us Different */}
        <section className="mb-16 bg-slate-900 rounded-2xl p-8 text-white">
          <h2 className="font-fraunces text-3xl font-bold mb-6">{t("different.title")}</h2>
          <p className="font-lexend text-lg text-slate-300 mb-8">
            {t("different.subtitle")}
          </p>
          <ul className="space-y-4 mb-8">
            {[
              "different.paperTrading",
              "different.norwegian",
              "different.education",
              "different.transparency",
              "different.community",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />
                <span className="font-lexend text-slate-200">{t(item)}</span>
              </li>
            ))}
          </ul>
          
          {/* Risk Warning */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="font-lexend text-red-300 text-sm text-center font-medium flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {t("risk.warning")}
            </p>
          </div>
        </section>

        {/* Team Section */}
        <section className="mb-16">
          <h2 className="font-fraunces text-3xl font-bold text-slate-900 mb-8">
            {t("team.title")}
          </h2>
          
          <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 mb-6">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold text-blue-600">{t("team.tom.initials")}</span>
              </div>
              <div>
                <h3 className="font-fraunces text-2xl font-bold text-slate-900 mb-1">
                  {t("team.tom.name")}
                </h3>
                <p className="font-lexend text-blue-600 font-semibold mb-4">
                  {t("team.tom.role")}
                </p>
                <p className="font-lexend text-slate-600">
                  {t("team.tom.bio")}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-6">
            <h4 className="font-fraunces text-lg font-bold text-slate-900 mb-3">
              {t("team.partners.title")}
            </h4>
            <ul className="font-lexend text-slate-600 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                {t("team.partners.supabase")}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                {t("team.partners.vercel")}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                {t("team.partners.binance")}
              </li>
            </ul>
          </div>
        </section>

        {/* Contact Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="font-fraunces text-3xl font-bold text-slate-900 mb-4">
              {t("contact.title")}
            </h2>
            <p className="font-lexend text-lg text-slate-600 max-w-2xl mx-auto">
              {t("contact.subtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mx-auto mb-4">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="font-fraunces font-bold text-slate-900 mb-2">{t("contact.email")}</h3>
              <a href={`mailto:${t("contact.emailValue")}`} className="font-lexend text-blue-600 hover:underline">
                {t("contact.emailValue")}
              </a>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mx-auto mb-4">
                <Landmark className="w-6 h-6" />
              </div>
              <h3 className="font-fraunces font-bold text-slate-900 mb-2">{t("contact.org")}</h3>
              <p className="font-lexend text-slate-600">{t("contact.orgNumber")}</p>
              <p className="font-lexend text-xs text-slate-400 mt-1">{t("contact.orgName")}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mx-auto mb-4">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-fraunces font-bold text-slate-900 mb-2">{t("contact.location")}</h3>
              <p className="font-lexend text-slate-600">{t("contact.locationValue")}</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-linear-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white text-center">
          <h2 className="font-fraunces text-3xl font-bold mb-4">{t("cta.title")}</h2>
          <p className="font-lexend text-xl text-blue-100 mb-8">{t("cta.subtitle")}</p>
          <Link href="/login">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              {t("cta.button")}
            </Button>
          </Link>
          <p className="font-lexend text-blue-200 text-sm mt-4">{t("cta.noCard")}</p>
        </div>
      </div>
    </div>
  );
}
