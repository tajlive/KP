/**
 * Progress Edge Function
 * GET: Henter all kursfremgang for autentisert bruker
 * POST: Upsert progress-oppføring for en kurs/leksjon
 *
 * Tabell: user_course_progress
 * Columns: user_id, course_id, lesson_id, progress_percent, is_completed, completed_at, last_accessed_at
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

interface ProgressUpsert {
  user_id: string;
  course_id: string;
  lesson_id?: string;
  progress_percent?: number;
  is_completed?: boolean;
  completed_at?: string;
  last_accessed_at: string;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse("Ikke autentisert", 401);
    }

    // Route methods
    switch (req.method) {
      case "GET":
        return handleGet(supabase, user.id);
      case "POST":
        return handlePost(supabase, user.id, req);
      default:
        return errorResponse("Method not allowed", 405);
    }
  } catch (error) {
    console.error("[progress] Error:", error);
    return errorResponse("Internal server error", 500);
  }
});

async function handleGet(
  supabase: any,
  userId: string,
): Promise<Response> {
  const { data: progress, error } = await supabase
    .from("user_course_progress")
    .select("*")
    .eq("user_id", userId)
    .order("last_accessed_at", { ascending: false });

  if (error) {
    console.error("[progress] GET query error:", error);
  }

  const rows = progress ?? [];

  const stats = {
    totalCourses: new Set(rows.map((p: any) => p.course_id)).size,
    completedLessons: rows.filter((p: any) => p.is_completed).length,
    totalProgress: rows.length
      ? Math.round(
          rows.reduce(
            (acc: number, p: any) => acc + (p.progress_percent || 0),
            0,
          ) / rows.length,
        )
      : 0,
    recentlyAccessed: rows.slice(0, 5),
  };

  return jsonResponse({ progress: rows, stats });
}

async function handlePost(
  supabase: any,
  userId: string,
  req: Request,
): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { courseId, lessonId, progressPercent, isCompleted } = body as {
    courseId?: string;
    lessonId?: string;
    progressPercent?: number;
    isCompleted?: boolean;
  };

  if (!courseId || typeof courseId !== "string") {
    return errorResponse("courseId is required and must be a valid UUID", 400);
  }

  const upsertData: ProgressUpsert = {
    user_id: userId,
    course_id: courseId,
    last_accessed_at: new Date().toISOString(),
  };

  if (lessonId) upsertData.lesson_id = lessonId;
  if (progressPercent !== undefined) {
    upsertData.progress_percent = Math.min(100, Math.max(0, Number(progressPercent)));
  }
  if (isCompleted !== undefined) {
    upsertData.is_completed = Boolean(isCompleted);
    if (upsertData.is_completed) {
      upsertData.completed_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from("user_course_progress")
    .upsert([upsertData], {
      onConflict: "user_id,course_id,lesson_id",
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
    console.error("[progress] POST upsert error:", error);
    return errorResponse("Kunne ikke oppdatere fremgang", 500);
  }

  return jsonResponse({ success: true, progress: data });
}
