'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Clock, 
  BarChart3, 
  Award, 
  Lock, 
  CheckCircle,
  PlayCircle,
  ArrowRight,
  BookOpen,
  Users
} from 'lucide-react';
import { createClient } from '@/lib/utils';
import { toast } from 'sonner';

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes: number;
  is_free: boolean;
  price_nok: number;
  category: string;
  tags: string[];
}

interface UserProgress {
  progress_percentage: number;
  completed: boolean;
  current_lesson_id: string | null;
}

interface CourseDetailClientProps {
  course: Course;
  userProgress: UserProgress | null;
  isAuthenticated: boolean;
  locale: string;
}

export default function CourseDetailClient({
  course,
  userProgress,
  isAuthenticated,
  locale,
}: CourseDetailClientProps) {
  const t = useTranslations('courses');
  const router = useRouter();
  const supabase = createClient();
  const [enrolling, setEnrolling] = useState(false);

  const levelLabels = {
    beginner: t('level.beginner'),
    intermediate: t('level.intermediate'),
    advanced: t('level.advanced'),
  };

  const levelColors = {
    beginner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    advanced: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  /**
   * Enroll user in course
   */
  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push(`/${locale}/innlogging?redirect=/courses/${course.slug}`);
      return;
    }

    // If paid course, redirect to payment
    if (!course.is_free && !userProgress) {
      router.push(`/${locale}/checkout?course=${course.id}`);
      return;
    }

    // If free course, enroll directly
    setEnrolling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_course_progress')
        .insert({
          user_id: user.id,
          course_id: course.id,
          progress_percentage: 0,
          completed: false,
        });

      if (error) throw error;

      // Redirect to first lesson
      router.push(`/${locale}/learn/${course.slug}`);
      router.refresh();
    } catch (error) {
      console.error('Enrollment error:', error);
      toast.error(t('enrollError'));
    } finally {
      setEnrolling(false);
    }
  };

  /**
   * Continue course
   */
  const handleContinue = () => {
    router.push(`/${locale}/learn/${course.slug}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Left: Course Info */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${levelColors[course.level]}`}>
              {levelLabels[course.level]}
            </span>
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              {course.category}
            </span>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {course.title}
          </h1>

          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            {course.description}
          </p>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-6 text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>{course.duration_minutes} {t('minutes')}</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              <span>{levelLabels[course.level]}</span>
            </div>
            {userProgress && (
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-500" />
                <span>{userProgress.progress_percentage}% {t('completed')}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-6">
            {course.tags?.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Enrollment Card */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 sticky top-8">
            {/* Thumbnail placeholder */}
            <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-emerald-600 rounded-xl mb-6 flex items-center justify-center">
              <PlayCircle className="w-16 h-16 text-white" />
            </div>

            {/* Price */}
            {course.is_free ? (
              <div className="text-center mb-6">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {t('free')}
                </p>
              </div>
            ) : (
              <div className="text-center mb-6">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {course.price_nok} kr
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('oneTimePayment')}
                </p>
              </div>
            )}

            {/* CTA Button */}
            {userProgress ? (
              userProgress.completed ? (
                <button
                  onClick={handleContinue}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all shadow-lg"
                >
                  <CheckCircle className="w-5 h-5" />
                  {t('reviewCourse')}
                </button>
              ) : (
                <button
                  onClick={handleContinue}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/30"
                >
                  <PlayCircle className="w-5 h-5" />
                  {t('continueCourse')}
                  <ArrowRight className="w-5 h-5" />
                </button>
              )
            ) : course.is_free ? (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
              >
                {enrolling ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    {t('enrolling')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {t('enrollFree')}
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
              >
                {enrolling ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    {t('processing')}
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    {t('enrollPaid')}
                  </>
                )}
              </button>
            )}

            {/* Benefits */}
            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('benefit.lifetime')}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('benefit.progress')}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('benefit.certificate')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {t('whatYouWillLearn')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-gray-300">
                {t(`learningObjective${i}`)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Course Includes */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-6 text-center">
          <BookOpen className="w-10 h-10 text-blue-500 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            {t('includes.videos')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('includes.videosDesc')}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-6 text-center">
          <Users className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            {t('includes.community')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('includes.communityDesc')}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-6 text-center">
          <Award className="w-10 h-10 text-green-500 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            {t('includes.certificate')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('includes.certificateDesc')}
          </p>
        </div>
      </div>
    </div>
  );
}
