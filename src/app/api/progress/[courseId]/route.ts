/**
 * Progress API for spesifikt kurs
 * GET: Hent detaljert fremgang for et kurs
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ courseId: string }>;
}

interface CourseModule {
  id: string;
  title: string;
  lessons?: Array<{ id: string }>;
}

interface ProgressData {
  lesson_id: string;
  is_completed: boolean;
  last_accessed_at: string;
  started_at: string;
  completed_at: string | null;
  progress_percent: number;
}

interface CourseData {
  id: string;
  title: string;
  slug: string;
  level: string;
  description: string;
  modules: unknown;
}

/**
 * GET /api/progress/[courseId]
 * Hent detaljert fremgang for et spesifikt kurs
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { courseId } = await params;
    const supabase = await createClient();
    
    // Verifiser bruker
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Ikke autentisert' },
        { status: 401 }
      );
    }

    // Hent kurs-info med moduler og leksjoner
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        id, title, slug, level, description,
        modules:course_modules(
          id, title, slug, sort_order,
          lessons:course_lessons(
            id, title, slug, duration_minutes, sort_order
          )
        )
      `)
      .eq('id', courseId)
      .single();

    if (courseError) {
      return NextResponse.json(
        { error: 'Kurs ikke funnet' },
        { status: 404 }
      );
    }

    // Hent brukerens fremgang for dette kurset
    const { data: progress, error: progressError } = await supabase
      .from('user_course_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId);

    if (progressError) {
      console.error('[Progress API] Henting av fremgang feilet:', progressError);
      return NextResponse.json(
        { error: 'Kunne ikke hente fremgang' },
        { status: 500 }
      );
    }

    // Type cast course data
    const courseData = course as CourseData;
    const modules = (courseData.modules || []) as CourseModule[];
    const progressData = (progress || []) as ProgressData[];
    
    // Beregn kurs-statistikk
    const totalLessons = modules.reduce(
      (acc, m) => acc + (m.lessons?.length || 0), 
      0
    );
    
    const completedLessons = progressData.filter(p => p.is_completed).length;
    const overallProgress = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;

    // Map fremgang til leksjoner
    const progressMap = new Map(
      progressData.map(p => [p.lesson_id, p])
    );

    // Beregn modul-fremgang
    const moduleProgress = modules.map((module) => {
      const lessons = module.lessons || [];
      const completedInModule = lessons.filter(
        (l) => progressMap.get(l.id)?.is_completed
      ).length;
      
      return {
        moduleId: module.id,
        title: module.title,
        totalLessons: lessons.length,
        completedLessons: completedInModule,
        progress: lessons.length > 0 
          ? Math.round((completedInModule / lessons.length) * 100)
          : 0,
      };
    });

    // Sort progress by date
    const sortedProgress = [...progressData].sort((a, b) => {
      const dateA = new Date(a.last_accessed_at || 0).getTime();
      const dateB = new Date(b.last_accessed_at || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      course: {
        id: courseData.id,
        title: courseData.title,
        slug: courseData.slug,
        level: courseData.level,
        description: courseData.description,
      },
      progress: {
        overall: overallProgress,
        completedLessons,
        totalLessons,
        startedAt: progressData[0]?.started_at || null,
        lastAccessedAt: sortedProgress[0]?.last_accessed_at || null,
      },
      moduleProgress,
      lessonProgress: progressData.map(p => ({
        lessonId: p.lesson_id,
        progressPercent: p.progress_percent,
        isCompleted: p.is_completed,
        completedAt: p.completed_at,
        lastAccessedAt: p.last_accessed_at,
      })),
    });

  } catch (error) {
    console.error('[Progress API] Uventet feil:', error);
    return NextResponse.json(
      { error: 'Intern serverfeil' },
      { status: 500 }
    );
  }
}
