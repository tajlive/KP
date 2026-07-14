import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api-error-handler';

const progressUpdateSchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid().optional(),
  progressPercent: z.number().min(0).max(100).optional(),
  isCompleted: z.boolean().optional(),
});

interface ProgressUpdateData {
  user_id: string;
  course_id: string;
  lesson_id?: string;
  progress_percent?: number;
  is_completed?: boolean;
  completed_at?: string;
  last_accessed_at: string;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
  }

  let progress: unknown[] = [];
  
  try {
    const { data, error } = await supabase
      .from('user_course_progress')
      .select(`*`)
      .eq('user_id', user.id)
      .order('last_accessed_at', { ascending: false });

    if (!error && data) progress = data;
  } catch {
    // Ikke-kritisk — progress er valgfritt
  }

  const stats = {
    totalCourses: new Set(progress.map(p => p.course_id)).size,
    completedLessons: progress.filter(p => p.is_completed).length,
    totalProgress: progress.length 
      ? Math.round(progress.reduce((acc, p) => acc + (p.progress_percent || 0), 0) / progress.length)
      : 0,
    recentlyAccessed: progress.slice(0, 5),
  };

  return NextResponse.json({ progress, stats });
}, '/api/progress');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
  }

  const body = await request.json();
  const validation = progressUpdateSchema.safeParse(body);
  
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Ugyldig data', details: validation.error.format() },
      { status: 400 }
    );
  }

  const { courseId, lessonId, progressPercent, isCompleted } = validation.data;

  const upsertData: ProgressUpdateData = {
    user_id: user.id,
    course_id: courseId,
    last_accessed_at: new Date().toISOString(),
  };

  if (lessonId) upsertData.lesson_id = lessonId;
  if (progressPercent !== undefined) upsertData.progress_percent = progressPercent;
  if (isCompleted !== undefined) {
    upsertData.is_completed = isCompleted;
    if (isCompleted) upsertData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('user_course_progress')
    .upsert(upsertData, {
      onConflict: 'user_id,course_id,lesson_id',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Kunne ikke oppdatere fremgang' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, progress: data });
}, '/api/progress');
