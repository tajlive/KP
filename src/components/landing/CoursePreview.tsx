"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { BookOpen, BarChart3, Target } from "lucide-react";
import { hrefWithLocale } from "@/i18n/href-with-locale";

const courseIcons = [BookOpen, BarChart3, Target];

export function CoursePreview() {
  const locale = useLocale();
  const t = useTranslations("coursePreview");
  const kursHref = hrefWithLocale(locale, "/kurs");

  const courses = [
    {
      title: t("course1.title"),
      level: t("course1.level"),
      time: t("course1.time"),
      icon: courseIcons[0],
    },
    {
      title: t("course2.title"),
      level: t("course2.level"),
      time: t("course2.time"),
      icon: courseIcons[1],
    },
    {
      title: t("course3.title"),
      level: t("course3.level"),
      time: t("course3.time"),
      icon: courseIcons[2],
    },
  ];

  return (
    <section
      id="land-kurs"
      className="scroll-mt-24 border-y border-white/[0.06] bg-slate-950/90 py-14 md:py-20"
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white mb-3">
            {t("sectionTitle")}
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            {t("sectionSubtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {courses.map((course, idx) => (
            <Link
              key={idx}
              href={kursHref}
              aria-label={`${t("seeAllCourses")}: ${course.title}`}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-sm transition-all duration-200 hover:border-[#0052FF]/45 hover:shadow-[0_0_40px_-12px_rgba(0,82,255,0.35)] group cursor-pointer block"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0052FF]/15">
                  <course.icon className="h-6 w-6 text-[#3d7aff]" />
                </div>
                <span className="rounded-md bg-[#0052FF]/15 px-2 py-1 text-xs font-semibold text-[#3d7aff]">
                  {t("freeBadge")}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2 group-hover:text-[#3d7aff] transition-colors">
                {course.title}
              </h3>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="bg-slate-700 px-2 py-1 rounded text-xs">
                  {course.level}
                </span>
                <span>·</span>
                <span>{course.time}</span>
              </div>
              <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full w-0 bg-[#0052FF] rounded-full transition-all duration-300 group-hover:w-full" />
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            href={kursHref}
            className="inline-flex items-center gap-2 font-semibold text-[#3d7aff] transition-colors hover:text-white"
          >
            {t("seeAllCourses")}
            <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
