import { Button } from "@/components/ui/button";
import { ArrowRight, Ban, BookOpen, Clock, Users } from "lucide-react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("about.title"),
    description: t("about.description"),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "aboutUs" });
  const tNav = await getTranslations({ locale, namespace: "navigation" });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HERO */}
      <section className="relative py-24 px-4 overflow-hidden bg-white border-b border-slate-100">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-50 rounded-full blur-3xl opacity-60" />
        </div>

        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-sm font-medium mb-8">
            <Users className="w-4 h-4" />
            Vår Historie
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-8 leading-tight tracking-tight">
            {t("heroTitle")}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              {t("heroTitleHighlight")}
            </span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {t("heroDescription")}
          </p>
        </div>
      </section>

      {/* QUOTE SECTION */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-10 md:p-16 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6 italic">
                "{t("quote.title")}"
              </h2>
              <p className="text-xl md:text-2xl text-slate-600 leading-relaxed mb-10 font-light">
                {t("quote.text")}
              </p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xl text-slate-400 border border-slate-200">
                  TJ
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-lg">
                    {t("quote.author")}
                  </p>
                  <p className="text-slate-500 font-medium">
                    {t("quote.role")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STORY TIMELINE */}
      <section className="py-24 max-w-4xl mx-auto px-4 space-y-16">
        {/* Part 1 */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start group">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100 shadow-sm transition-transform group-hover:scale-105 group-hover:bg-red-100">
            <span className="text-red-600 font-bold text-2xl">1</span>
          </div>
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex-1 relative">
            <div className="absolute top-8 -left-3 w-6 h-6 bg-white border-l border-b border-slate-100 transform rotate-45 hidden md:block"></div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {t("story.part1.title")}
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              {t("story.part1.content")}
            </p>
          </div>
        </div>

        {/* Part 2 */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start group">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 shadow-sm transition-transform group-hover:scale-105 group-hover:bg-indigo-100">
            <span className="text-indigo-600 font-bold text-2xl">2</span>
          </div>
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex-1 relative">
            <div className="absolute top-8 -left-3 w-6 h-6 bg-white border-l border-b border-slate-100 transform rotate-45 hidden md:block"></div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {t("story.part2.title")}
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              {t("story.part2.content")}
            </p>
          </div>
        </div>

        {/* Part 3 */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start group">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100 shadow-sm transition-transform group-hover:scale-105 group-hover:bg-emerald-100">
            <span className="text-emerald-600 font-bold text-2xl">3</span>
          </div>
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex-1 relative">
            <div className="absolute top-8 -left-3 w-6 h-6 bg-white border-l border-b border-slate-100 transform rotate-45 hidden md:block"></div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {t("story.part3.title")}
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              {t("story.part3.content")}
            </p>
          </div>
        </div>

        {/* Part 4 */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start group">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100 shadow-sm transition-transform group-hover:scale-105 group-hover:bg-emerald-100">
            <span className="text-emerald-600 font-bold text-2xl">4</span>
          </div>
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex-1 relative">
            <div className="absolute top-8 -left-3 w-6 h-6 bg-white border-l border-b border-slate-100 transform rotate-45 hidden md:block"></div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {t("story.part4.title")}
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              {t("story.part4.content")}
            </p>
          </div>
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              {t("philosophy.title")}
            </h2>
            <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <Ban className="h-7 w-7 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                {t("philosophy.noPyramid")}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {t("philosophy.noPyramidDesc")}
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <BookOpen className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                {t("philosophy.educationFirst")}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {t("philosophy.educationFirstDesc")}
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center mb-6">
                <Clock className="h-7 w-7 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                {t("philosophy.patience")}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {t("philosophy.patienceDesc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center px-4 relative overflow-hidden bg-slate-900">
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl opacity-50 pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 leading-tight">
            {t("philosophy.cta")}
          </h2>
          <Button
            size="lg"
            className="h-14 px-10 text-lg font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 hover:scale-105 transition-all"
            asChild
          >
            <Link href={`/${locale}/signup`}>
              {tNav("signup")} <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
