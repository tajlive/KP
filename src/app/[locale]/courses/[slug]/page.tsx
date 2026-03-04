



import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';
import CourseDetailClient from '@/components/courses/CourseDetailClient';
import { Metadata } from 'next';

interface CoursePageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

/**
 * Generate metadata for course page (SEO)
 */
export async function generateMetadata({ 
  params 
}: CoursePageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const supabase = await createClient();
  
  const { data: course } = await supabase
    .from('courses')
    .select('title, description')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (!course) {
    return {
      title: 'Course Not Found',
    };
  }

  return {
    title: `${course.title} | Klarpakke`,
    description: course.description,
    openGraph: {
      title: course.title,
      description: course.description,
      type: 'website',
    },
  };
}

/**
 * Course detail page
 * Shows course information and enrollment options
 */
export default async function CoursePage({ params }: CoursePageProps) {
  const { locale, slug } = await params;
  const supabase = await createClient();
  const t = await getTranslations('courses');

  // Fetch course data
  const { data: course, error } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !course) {
    notFound();
  }

  // Check if user is enrolled (if authenticated)
  const { data: { user } } = await supabase.auth.getUser();
  
  let userProgress = null;
  if (user) {
    const { data } = await (await createClient())
      .from('user_course_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .single();
    
    userProgress = data;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <CourseDetailClient
        course={course}
        userProgress={userProgress}
        isAuthenticated={!!user}
        locale={locale}
      />
    </div>
  );
}
