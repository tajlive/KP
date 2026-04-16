import { createClient, createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { ProgressBar } from "@/features/kurs/ProgressBar";
import { LessonQuiz } from "@/features/kurs/LessonQuiz";
import { markLessonComplete } from "@/lib/courses/actions";
import ReactMarkdown from "react-markdown";
import { getTranslations } from "next-intl/server";

interface PageProps {
  params: Promise<{
    locale: string;
    moduleSlug: string;
    lessonSlug: string;
  }>;
}

interface _QuizQuestion {
  id: string;
  question_no: string;
  question_en: string;
  options: { id: string; text_no: string; text_en: string }[];
  correct_option_id: string;
  explanation_no: string;
  explanation_en: string;
}

interface LessonData {
  id: string;
  slug: string;
  title_no: string;
  title_en: string;
  content_no: string | null;
  content_en: string | null;
  estimated_minutes: number | null;
}

interface _ModuleData {
  id: string;
  slug: string;
  title_no: string;
  title_en: string;
}

async function getLessonData(
  moduleSlug: string,
  lessonSlug: string,
  userId?: string
) {
  const supabase = await createClient();

  // Get module
  const { data: module, error: moduleError } = await supabase
    .from("course_modules")
    .select("*")
    .eq("slug", moduleSlug)
    .eq("is_published", true)
    .single();

  if (moduleError || !module) {
    return null;
  }

  // Get lesson
  const { data: lesson, error: lessonError } = await supabase
    .from("course_lessons")
    .select("*")
    .eq("module_id", module.id)
    .eq("slug", lessonSlug)
    .eq("is_published", true)
    .single();

  if (lessonError || !lesson) {
    return null;
  }

  // Get all lessons in module for navigation
  const { data: allLessons } = await supabase
    .from("course_lessons")
    .select("id, slug, title_no, title_en")
    .eq("module_id", module.id)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  // Get quiz questions
  const { data: questionsRaw } = await supabase
    .from("lesson_quiz_questions")
    .select("*")
    .eq("lesson_id", lesson.id)
    .order("sort_order", { ascending: true });
  
  const questions = (questionsRaw || []).map(q => ({
    id: q.id,
    question_no: q.question_no,
    question_en: q.question_en,
    options: q.options as { id: string; text_no: string; text_en: string }[],
    correct_option_id: q.correct_option_id,
    explanation_no: q.explanation_no || "",
    explanation_en: q.explanation_en || "",
  }));

  // Get user progress
  let userProgress = null;
  let completedLessonIds: string[] = [];
  if (userId) {
    const { data: progress } = await supabase
      .from("user_lesson_progress")
      .select("status")
      .eq("user_id", userId)
      .eq("lesson_id", lesson.id)
      .single();
    userProgress = progress;

    // Get all completed lessons in module
    const { data: allProgress } = await supabase
      .from("user_lesson_progress")
      .select("lesson_id, status")
      .eq("user_id", userId)
      .eq("status", "completed")
      .in(
        "lesson_id",
        (allLessons || []).map((l) => l.id)
      );
    completedLessonIds =
      allProgress?.map((p) => p.lesson_id) || [];
  }

  // Find current lesson index
  const currentIndex =
    allLessons?.findIndex((l) => l.id === lesson.id) ?? -1;
  const prevLesson = currentIndex > 0 ? allLessons?.[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < (allLessons?.length || 0) - 1
      ? allLessons?.[currentIndex + 1]
      : null;

  return {
    module,
    lesson,
    questions: questions || [],
    allLessons: allLessons || [],
    userProgress,
    completedLessonIds,
    currentIndex,
    prevLesson,
    nextLesson,
  };
}

export default async function LessonPage({ params }: PageProps) {
  const { locale, moduleSlug, lessonSlug } = await params;

  const supabaseAuth = await createServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  const data = await getLessonData(moduleSlug, lessonSlug, user?.id);

  if (!data || !data.lesson || !data.module) {
    notFound();
  }

  const {
    module,
    lesson,
    questions,
    allLessons,
    userProgress,
    completedLessonIds,
    currentIndex,
    prevLesson,
    nextLesson,
  } = data;

  const isCompleted = userProgress?.status === "completed";
  const completedCount = completedLessonIds.length;

  const t = await getTranslations("LessonPage");


  const title = locale === "no" ? lesson.title_no : lesson.title_en;
  const rawContent = locale === "no" ? lesson.content_no : lesson.content_en;
  const content = rawContent?.replace(/\\n/g, "\n") ?? "";
  const moduleTitle = locale === "no" ? module.title_no : module.title_en;

  const userId = user?.id ?? null;
  const lessonId = lesson.id;

  async function handleLessonComplete() {
    "use server";
    if (userId && lessonId) {
      await markLessonComplete(userId, lessonId);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back link */}
      <Link
        href={`/${locale}/kurs/${moduleSlug}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        {t("backToModule")}
      </Link>

      {/* Progress bar */}
      <ProgressBar
        current={completedCount}
        total={allLessons.length}
        moduleTitle={moduleTitle}
        locale={locale}
      />

      {/* Lesson header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">
            {t("lesson")} {currentIndex + 1} {t("of")} {allLessons.length}
          </Badge>
          {isCompleted && (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {t("completed")}
            </Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold mb-4">{title}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {lesson.estimated_minutes} {t("minutes")}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            {questions.length} {t("quiz")}
          </span>
        </div>
      </div>

      {/* Lesson content */}
      <Card className="mb-8">
        <CardContent className="p-6 md:p-8">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {/* Quiz section */}
      {questions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {t("testKnowledge")}
          </h2>
          {user ? (
            <LessonQuiz
              questions={questions}
              lessonId={lesson.id}
              userId={user.id}
              locale={locale}
              onComplete={handleLessonComplete}
            />
          ) : (
            <Card className="bg-muted/50">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-4">{t("loginRequired")}</p>
                <Link href={`/${locale}/innlogging`}>
                  <Button>{t("loginButton")}</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t">
        {prevLesson ? (
          <Link
            href={`/${locale}/kurs/${moduleSlug}/leksjon/${prevLesson.slug}`}
          >
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("previous")}
            </Button>
          </Link>
        ) : (
          <div />
        )}

        {nextLesson ? (
          <Link
            href={`/${locale}/kurs/${moduleSlug}/leksjon/${nextLesson.slug}`}
          >
            <Button>
              {t("next")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        ) : (
          <Link href={`/${locale}/kurs/${moduleSlug}`}>
            <Button variant="default">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {t("finishModule")}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { locale, moduleSlug, lessonSlug } = await params;
  const supabase = await createClient();

  const { data: module } = await supabase
    .from("course_modules")
    .select("id")
    .eq("slug", moduleSlug)
    .eq("is_published", true)
    .single();

  const t = await getTranslations("LessonPage");

  if (!module) {
    return {
      title: t("metadataTitle", { title: t("lesson") }),
    };
  }

  const { data: lesson } = await supabase
    .from("course_lessons")
    .select("title_no, title_en")
    .eq("module_id", module.id)
    .eq("slug", lessonSlug)
    .eq("is_published", true)
    .single();

  const title = lesson
    ? locale === "no"
      ? lesson.title_no
      : lesson.title_en
    : t("lesson");

  return {
    title: t("metadataTitle", { title }),
    description: t("metadataDescription"),
  };
}
