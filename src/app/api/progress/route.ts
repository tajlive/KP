/**
 * Progress API - Hent og oppdater brukerens kurs-fremgang
 * 2026-stil: Clean, typed, med Zod-validering
 */

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Valideringsschema for fremgangsoppdatering
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

/**
 * GET /api/progress
 * Hent alle brukerens fremganger
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Verifiser bruker
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Ikke autentisert' },
        { status: 401 }
      );
    }

    // Hent fremgang med kurs-info — tåler manglende tabeller
    let progress: any[] = [];
    
    try {
      const { data, error } = await supabase
        .from('user_course_progress')
        .select(`*`)
        .eq('user_id', user.id)
        .order('last_accessed_at', { ascending: false });

      if (!error && data) {
        progress = data;
      }
    } catch (_) {
      // Tabell finnes ikke — returner tomt
    }

    // Beregn aggregert statistikk
    const stats = {
      totalCourses: new Set(progress?.map(p => p.course_id)).size,
      completedLessons: progress?.filter(p => p.is_completed).length || 0,
      totalProgress: progress?.length 
        ? Math.round(progress.reduce((acc, p) => acc + (p.progress_percent || 0), 0) / progress.length)
        : 0,
      recentlyAccessed: progress?.slice(0, 5) || [],
    };

    return NextResponse.json({
      progress: progress || [],
      stats,
    });

  } catch (error) {
    console.error('[Progress API] Uventet feil:', error);
    return NextResponse.json(
      { error: 'Intern serverfeil' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/progress
 * Oppdater fremgang for en leksjon/kurs
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Verifiser bruker
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Ikke autentisert' },
        { status: 401 }
      );
    }

    // Parse og valider body
    const body = await request.json();
    const validation = progressUpdateSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ugyldig data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { courseId, lessonId, progressPercent, isCompleted } = validation.data;

    // Opprett upsert data
    const upsertData: ProgressUpdateData = {
      user_id: user.id,
      course_id: courseId,
      last_accessed_at: new Date().toISOString(),
    };

    if (lessonId) {
      upsertData.lesson_id = lessonId;
    }

    if (progressPercent !== undefined) {
      upsertData.progress_percent = progressPercent;
    }

    if (isCompleted !== undefined) {
      upsertData.is_completed = isCompleted;
      if (isCompleted) {
        upsertData.completed_at = new Date().toISOString();
      }
    }

    // Upsert fremgang
    const { data, error } = await supabase
      .from('user_course_progress')
      .upsert(upsertData, {
        onConflict: 'user_id,course_id,lesson_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[Progress API] Oppdatering feilet:', error);
      return NextResponse.json(
        { error: 'Kunne ikke oppdatere fremgang' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      progress: data,
    });

  } catch (error) {
    console.error('[Progress API] Uventet feil:', error);
    return NextResponse.json(
      { error: 'Intern serverfeil' },
      { status: 500 }
    );
  }
}
