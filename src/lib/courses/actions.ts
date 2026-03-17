"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { awardKLT } from "@/lib/gamification/klt";
import { KLT_REWARDS } from "@/lib/gamification/klt";

/**
 * Mark a lesson as completed for a user.
 * Progress is stored in user_lesson_progress; KLT is awarded once per lesson (idempotent).
 */
export async function markLessonComplete(userId: string, lessonId: string) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("user_lesson_progress")
    .select("status")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const wasAlreadyCompleted = existing?.status === "completed";

  const { data, error } = await supabase
    .from("user_lesson_progress")
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        status: "completed",
        completed_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,lesson_id",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error marking lesson complete:", error);
    throw new Error("Failed to mark lesson as complete");
  }

  if (!wasAlreadyCompleted) {
    await awardKLT({
      userId,
      amount: KLT_REWARDS.LESSON_COMPLETE,
      type: "lesson_complete",
      reason: "Leksjon fullført",
      metadata: { lesson_id: lessonId },
      supabase,
    });

    // Check if this was the last lesson in the module → award module completion (500 KLT, once per module)
    const { data: lessonRow } = await supabase
      .from("course_lessons")
      .select("module_id")
      .eq("id", lessonId)
      .single();
    const moduleId = lessonRow?.module_id;
    if (moduleId) {
      const { data: moduleLessons } = await supabase
        .from("course_lessons")
        .select("id")
        .eq("module_id", moduleId)
        .eq("is_published", true);
      const totalInModule = moduleLessons?.length ?? 0;
      if (totalInModule > 0) {
        const { data: completedInModule } = await supabase
          .from("user_lesson_progress")
          .select("lesson_id")
          .eq("user_id", userId)
          .eq("status", "completed")
          .in("lesson_id", moduleLessons!.map((l) => l.id));
        const completedCount = completedInModule?.length ?? 0;
        if (completedCount === totalInModule) {
          const { data: existingModuleRewards } = await supabase
            .from("klt_transactions")
            .select("id, metadata")
            .eq("user_id", userId)
            .eq("category", "course_complete");
          const alreadyAwarded = (existingModuleRewards ?? []).some(
            (r) => (r.metadata as { module_id?: string } | null)?.module_id === moduleId
          );
          if (!alreadyAwarded) {
            await awardKLT({
              userId,
              amount: KLT_REWARDS.COURSE_COMPLETE,
              type: "course_complete",
              reason: "Modul fullført",
              metadata: { module_id: moduleId },
              supabase,
            });
          }
        }
      }
    }
  }

  revalidatePath("/kurs");
  revalidatePath("/dashboard");
  revalidatePath(`/kurs/hvorfor-priser-beveger-seg`);

  return data;
}

/**
 * Submit a quiz answer
 */
export async function submitQuizAnswer(
  userId: string,
  questionId: string,
  selectedOptionId: string
) {
  const supabase = await createClient();

  // Get the correct answer from lesson_quiz_questions table
  const { data: question, error: questionError } = await supabase
    .from("lesson_quiz_questions")
    .select("correct_option_id")
    .eq("id", questionId)
    .single();

  if (questionError || !question) {
    console.error("Error fetching question:", questionError);
    throw new Error("Question not found");
  }

  const isCorrect = question.correct_option_id === selectedOptionId;

  // Record the attempt in lesson_quiz_attempts table
  const { data, error } = await supabase
    .from("lesson_quiz_attempts")
    .upsert(
      {
        user_id: userId,
        question_id: questionId,
        selected_option_id: selectedOptionId,
        is_correct: isCorrect,
        attempted_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,question_id",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error submitting quiz answer:", error);
    throw new Error("Failed to submit quiz answer");
  }

  return { isCorrect, data };
}

/**
 * Track time spent on a lesson
 */
export async function trackLessonTime(
  userId: string,
  lessonId: string,
  secondsSpent: number
) {
  const supabase = await createClient();

  // Get current progress
  const { data: existing } = await supabase
    .from("user_lesson_progress")
    .select("time_spent_seconds, status")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .single();

  const currentTime = existing?.time_spent_seconds || 0;
  const currentStatus = existing?.status || "not_started";

  const { data, error } = await supabase
    .from("user_lesson_progress")
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        time_spent_seconds: currentTime + secondsSpent,
        status: currentStatus === "not_started" ? "in_progress" : currentStatus,
      },
      {
        onConflict: "user_id,lesson_id",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error tracking lesson time:", error);
    throw new Error("Failed to track lesson time");
  }

  return data;
}

/**
 * Check if user has completed all required modules
 */
export async function hasCompletedRequiredModules(userId: string) {
  const supabase = await createClient();

  // Get all required modules
  const { data: requiredModules, error: modulesError } = await supabase
    .from("course_modules")
    .select("id")
    .eq("is_required", true)
    .eq("is_published", true);

  if (modulesError) {
    console.error("Error fetching required modules:", modulesError);
    return false;
  }

  if (!requiredModules || requiredModules.length === 0) {
    return true; // No required modules
  }

  // Get all lessons from required modules
  const { data: requiredLessons, error: lessonsError } = await supabase
    .from("course_lessons")
    .select("id")
    .in(
      "module_id",
      requiredModules.map((m) => m.id)
    )
    .eq("is_published", true);

  if (lessonsError || !requiredLessons) {
    console.error("Error fetching required lessons:", lessonsError);
    return false;
  }

  if (requiredLessons.length === 0) {
    return true; // No lessons in required modules
  }

  // Get user's completed lessons
  const { data: completedLessons, error: progressError } = await supabase
    .from("user_lesson_progress")
    .select("lesson_id")
    .eq("user_id", userId)
    .eq("status", "completed")
    .in(
      "lesson_id",
      requiredLessons.map((l) => l.id)
    );

  if (progressError) {
    console.error("Error fetching user progress:", progressError);
    return false;
  }

  const completedLessonIds = new Set(
    completedLessons?.map((p) => p.lesson_id) || []
  );
  const allLessonIds = new Set(requiredLessons.map((l) => l.id));

  // Check if all required lessons are completed
  for (const lessonId of allLessonIds) {
    if (!completedLessonIds.has(lessonId)) {
      return false;
    }
  }

  return true;
}

/**
 * Get module progress for a user
 */
export async function getModuleProgress(userId: string, moduleId: string) {
  const supabase = await createClient();

  // Get all lessons in module
  const { data: lessons, error: lessonsError } = await supabase
    .from("course_lessons")
    .select("id")
    .eq("module_id", moduleId)
    .eq("is_published", true);

  if (lessonsError || !lessons) {
    console.error("Error fetching lessons:", lessonsError);
    return { total: 0, completed: 0, percentage: 0 };
  }

  const lessonIds = lessons.map((l) => l.id);

  if (lessonIds.length === 0) {
    return { total: 0, completed: 0, percentage: 0 };
  }

  // Get completed lessons
  const { data: completed, error: progressError } = await supabase
    .from("user_lesson_progress")
    .select("lesson_id")
    .eq("user_id", userId)
    .eq("status", "completed")
    .in("lesson_id", lessonIds);

  if (progressError) {
    console.error("Error fetching progress:", progressError);
    return { total: lessonIds.length, completed: 0, percentage: 0 };
  }

  const completedCount = completed?.length || 0;
  const totalCount = lessonIds.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return {
    total: totalCount,
    completed: completedCount,
    percentage,
  };
}
