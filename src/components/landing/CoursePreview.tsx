'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { BookOpen, BarChart3, Target } from 'lucide-react';

const courseIcons = [BookOpen, BarChart3, Target];

export function CoursePreview() {
  const locale = useLocale();
  const t = useTranslations('coursePreview');
  
  const courses = [
    {
      title: t('course1.title'),
      level: t('course1.level'),
      time: t('course1.time'),
      icon: courseIcons[0],
    },
    {
      title: t('course2.title'),
      level: t('course2.level'),
      time: t('course2.time'),
      icon: courseIcons[1],
    },
    {
      title: t('course3.title'),
      level: t('course3.level'),
      time: t('course3.time'),
      icon: courseIcons[2],
    },
  ];

  return (
    <section className="py-12 bg-slate-900/50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-3">
            {t('sectionTitle')}
          </h2>
          <p className="text-slate-400">
            {t('sectionSubtitle')}
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {courses.map((course, idx) => (
            <Link
              key={idx}
              href={`/${locale}/kurs`}
              aria-label={`${t('seeAllCourses')}: ${course.title}`}
              className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-teal-500/50 transition-colors group cursor-pointer block"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center">
                  <course.icon className="w-6 h-6 text-teal-400" />
                </div>
                <span className="text-xs font-medium text-teal-400 bg-teal-500/10 px-2 py-1 rounded">
                  {t('freeBadge')}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2 group-hover:text-teal-400 transition-colors">
                {course.title}
              </h3>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="bg-slate-700 px-2 py-1 rounded text-xs">
                  {course.level}
                </span>
                <span>·</span>
                <span>{course.time}</span>
              </div>
              <div className="mt-4 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full w-0 bg-teal-500 rounded-full" />
              </div>
            </Link>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Link 
            href={`/${locale}/kurs`}
            className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 font-medium transition-colors"
          >
            {t('seeAllCourses')}
            <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
