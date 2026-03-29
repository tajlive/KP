"use client";

import { getCoursesData } from "@/lib/courses";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Clock,
  GraduationCap,
  Star,
  Users,
} from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useState } from "react";

const levelColors: Record<string, string> = {
  beginner:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  intermediate:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  advanced:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function getLevelKey(level: string): string {
  const map: Record<string, string> = {
    Nybegynner: "beginner",
    Beginner: "beginner",
    เริ่มต้น: "beginner",
    初学者: "beginner",
    Middels: "intermediate",
    Intermediate: "intermediate",
    ปานกลาง: "intermediate",
    中级: "intermediate",
    Avansert: "advanced",
    Advanced: "advanced",
    ขั้นสูง: "advanced",
    高级: "advanced",
  };
  return map[level] || "beginner";
}

export default function ClientKurs() {
  const locale = useLocale();
  const data = getCoursesData(locale);
  const courses = data.courses;
  const [filter, setFilter] = useState<string>("all");

  const filters = [
    {
      key: "all",
      label:
        locale === "no"
          ? "Alle"
          : locale === "th"
            ? "ทั้งหมด"
            : locale === "zh"
              ? "全部"
              : "All",
    },
    {
      key: "beginner",
      label:
        locale === "no"
          ? "Nybegynner"
          : locale === "th"
            ? "เริ่มต้น"
            : locale === "zh"
              ? "初学者"
              : "Beginner",
    },
    {
      key: "intermediate",
      label:
        locale === "no"
          ? "Middels"
          : locale === "th"
            ? "ปานกลาง"
            : locale === "zh"
              ? "中级"
              : "Intermediate",
    },
    {
      key: "advanced",
      label:
        locale === "no"
          ? "Avansert"
          : locale === "th"
            ? "ขั้นสูง"
            : locale === "zh"
              ? "高级"
              : "Advanced",
    },
  ];

  const filtered =
    filter === "all"
      ? courses
      : courses.filter((c) => getLevelKey(c.level) === filter);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12 } },
  };

  const item = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* HERO */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] bg-blue-100/40 dark:bg-blue-900/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-emerald-100/30 dark:bg-emerald-900/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 shadow-sm">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              {data.common.header.academy}
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-center text-slate-900 dark:text-white mb-4 tracking-tight"
          >
            {data.metadata.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-center text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto"
          >
            {data.metadata.subtitle}
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-6 mb-12"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {data.metadata.stats.activeStudents}
              </span>
              <span className="text-sm text-slate-500">
                {locale === "no"
                  ? "aktive studenter"
                  : locale === "th"
                    ? "นักเรียน"
                    : locale === "zh"
                      ? "活跃学生"
                      : "active students"}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {data.metadata.stats.totalLessons}
              </span>
              <span className="text-sm text-slate-500">
                {locale === "no"
                  ? "leksjoner"
                  : locale === "th"
                    ? "บทเรียน"
                    : locale === "zh"
                      ? "课程"
                      : "lessons"}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {data.metadata.stats.averageRating}
              </span>
              <span className="text-sm text-slate-500">
                {locale === "no"
                  ? "snitt-rating"
                  : locale === "th"
                    ? "คะแนนเฉลี่ย"
                    : locale === "zh"
                      ? "平均评分"
                      : "avg rating"}
              </span>
            </div>
          </motion.div>

          {/* Filter Tabs */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-2 mb-12"
          >
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === f.key
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                }`}
              >
                {f.label}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* COURSE GRID */}
      <section className="pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            key={filter}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filtered.map((course) => {
              const levelKey = getLevelKey(course.level);
              return (
                <motion.div key={course.id} variants={item}>
                  <Link
                    href={`/${locale}/kurs/${course.slug}`}
                    className="block group"
                  >
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      {/* Featured badge */}
                      {course.featured && (
                        <div className="absolute top-4 right-4 z-10">
                          <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full uppercase tracking-wide shadow-sm">
                            {locale === "no"
                              ? "Populær"
                              : locale === "th"
                                ? "ยอดนิยม"
                                : locale === "zh"
                                  ? "热门"
                                  : "Popular"}
                          </span>
                        </div>
                      )}

                      {/* Gradient Header */}
                      <div
                        className={`h-36 bg-linear-to-br ${course.color} flex items-center justify-center relative`}
                      >
                        <span className="text-6xl drop-shadow-lg">
                          {course.icon}
                        </span>
                        <div className="absolute inset-0 bg-linear-to-t from-black/10 to-transparent" />
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        {/* Level badge */}
                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${levelColors[levelKey]}`}
                          >
                            {course.level}
                          </span>
                        </div>

                        {/* Title & subtitle */}
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
                          {course.title}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                          {course.subtitle}
                        </p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-5">
                          {course.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400 text-xs rounded-md"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 mb-5 border-t border-slate-100 dark:border-gray-800 pt-4">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {course.duration}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5" />
                            {course.modules}{" "}
                            {locale === "no"
                              ? "moduler"
                              : locale === "th"
                                ? "โมดูล"
                                : locale === "zh"
                                  ? "模块"
                                  : "modules"}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5 text-yellow-500" />
                            {course.rating}
                          </div>
                        </div>

                        {/* CTA */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Users className="h-3.5 w-3.5" />
                            {course.students
                              ? `${(course.students as number).toLocaleString()} ${locale === "no"
                                  ? "studenter"
                                  : locale === "th"
                                    ? "นักเรียน"
                                    : locale === "zh"
                                      ? "学生"
                                      : "students"}`
                              : locale === "no"
                                ? "Åpent for alle"
                                : locale === "th"
                                  ? "เปิดสำหรับทุกคน"
                                  : locale === "zh"
                                    ? "对所有人开放"
                                    : "Open to all"}
                          </div>
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 group-hover:gap-2 transition-all">
                            {course.cta}
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <GraduationCap className="h-12 w-12 mx-auto text-slate-300 dark:text-gray-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">
                {locale === "no"
                  ? "Ingen kurs i denne kategorien ennå."
                  : locale === "th"
                    ? "ยังไม่มีคอร์สในหมวดนี้"
                    : locale === "zh"
                      ? "该分类暂无课程"
                      : "No courses in this category yet."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="pb-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-linear-to-br from-blue-600 to-blue-700 rounded-3xl p-10 text-center text-white shadow-xl shadow-blue-600/20">
            <h2 className="text-2xl font-bold mb-3">
              {data.metadata.cta.title}
            </h2>
            <p className="text-blue-100 mb-6 max-w-md mx-auto">
              {data.metadata.cta.description}
            </p>
            <Link
              href={`/${locale}/interessetest`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
            >
              {data.metadata.cta.button}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
