'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/utils';
import { BookOpen, Clock, GraduationCap, Loader2 } from 'lucide-react';

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  short_description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration_hours: number;
  price_nok: number;
}

interface CourseListProps {
  locale?: string;
}

export function CourseList({ locale = 'no' }: CourseListProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadCourses() {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('is_published', true)
          .order('order_index', { ascending: true });

        if (error) {
          throw error;
        }

        setCourses((data || []) as Course[]);
      } catch (err) {
        console.error('Error loading courses:', err);
        setError('Kunne ikke laste kurs. Vennligst prøv igjen senere.');
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">{locale === 'en' ? 'Loading courses...' : 'Laster kurs...'}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          {locale === 'en' ? 'Try again' : 'Prøv igjen'}
        </button>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          {locale === 'en' ? 'No courses available' : 'Ingen kurs tilgjengelig'}
        </h3>
        <p className="text-gray-500">
          {locale === 'en' ? 'Check back later for new courses!' : 'Kom tilbake senere for nye kurs!'}
        </p>
      </div>
    );
  }

  const levelLabels: Record<string, Record<string, string>> = {
    no: { beginner: 'Nybegynner', intermediate: 'Viderekommen', advanced: 'Avansert' },
    en: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
  };
  const labels = levelLabels[locale] ?? levelLabels['no'];

  const levelColors: { [key: string]: string } = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-blue-100 text-blue-700',
    advanced: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => (
        <Link
          key={course.id}
          href={`/${locale}/kurs/${course.slug}`}
          className="group block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200"
        >
          {/* Header */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                <BookOpen className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${levelColors[course.level]}`}>
                {labels[course.level]}
              </span>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
              {course.title}
            </h3>
            
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {course.short_description || course.description}
            </p>

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{course.duration_hours}t</span>
              </div>
              <div className="flex items-center gap-1">
                <GraduationCap className="w-4 h-4" />
                <span>{course.price_nok === 0 ? (locale === 'en' ? 'Free' : 'Gratis') : `${course.price_nok} kr`}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <span className="text-blue-600 font-medium text-sm group-hover:underline">
              {locale === 'en' ? 'View course →' : 'Se kurset →'}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
