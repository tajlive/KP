import { createClient, createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Circle,
  ArrowLeft,
  Play,
  Lock,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";
import { getTranslations } from "next-intl/server";

export const runtime = 'nodejs';

interface PageProps {
  params: Promise<{ locale: string; moduleSlug: string }>;
}

async function getModuleWithLessons(moduleSlug: string, userId?: string) {
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

  // Get lessons
  const { data: lessons, error: lessonsError } = await supabase
    .from("course_lessons")
    .select("*")
    .eq("module_id", module.id)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (lessonsError || !lessons) {
    return { module, lessons: [], progress: [] };
  }

  // Get user progress if logged in
  let progress: { lesson_id: string; status: string }[] = [];
  if (userId) {
    const { data: userProgress } = await supabase
      .from("user_lesson_progress")
      .select("lesson_id, status")
      .eq("user_id", userId)
      .in(
        "lesson_id",
        lessons.map((l) => l.id),
      );
    progress = (userProgress || []).filter(
      (p): p is { lesson_id: string; status: string } =>
        p.lesson_id != null && p.status != null,
    );
  }

  return { module, lessons, progress };
}

export default async function ModulePage({ params }: PageProps) {
  const { locale, moduleSlug } = await params;

  const supabaseAuth = await createServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  const data = await getModuleWithLessons(moduleSlug, user?.id);

  if (!data) {
    notFound();
  }

  const { module, lessons, progress } = data;
  const progressMap = new Map(progress.map((p) => [p.lesson_id, p.status]));

  const completedCount = lessons.filter(
    (l) => progressMap.get(l.id) === "completed",
  ).length;
  const progressPercentage =
    lessons.length > 0
      ? Math.round((completedCount / lessons.length) * 100)
      : 0;

  const t = await getTranslations("ModulePage");

  const title = locale === "no" ? module.title_no : module.title_en;
  const description =
    locale === "no" ? module.description_no : module.description_en;

  const difficultyColor =
    module.difficulty === "beginner"
      ? "bg-green-100 text-green-700"
      : module.difficulty === "intermediate"
        ? "bg-blue-100 text-blue-700"
        : "bg-purple-100 text-purple-700";

  const difficultyLabel = t(module.difficulty as "beginner" | "intermediate" | "advanced");

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back link */}
      <Link
        href={`/${locale}/kurs`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        {t("backToCourses")}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={difficultyColor}>{difficultyLabel}</Badge>
              {module.is_required && (
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-700"
                >
                  <Lock className="w-3 h-3 mr-1" />
                  {t("required")}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <p className="text-lg text-muted-foreground">{description}</p>

        {/* Progress bar for logged in users */}
        {user && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{t("progress")}</span>
                <span className="text-sm text-muted-foreground">
                  {completedCount} {t("of")} {lessons.length} {t("lessons")}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                {t("percentageCompleted", { percentage: progressPercentage })}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Lessons list */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          {t("lessonCount", { count: lessons.length })}
        </h2>

        {lessons.map((lesson, index) => {
          const status = progressMap.get(lesson.id) || "not_started";
          const isCompleted = status === "completed";
          const isInProgress = status === "in_progress";

          const lessonTitle =
            locale === "no" ? lesson.title_no : lesson.title_en;

          return (
            <Card
              key={lesson.id}
              className={`transition-all hover:shadow-md ${
                isCompleted ? "border-green-200 bg-green-50/30" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Status icon */}
                  <div className="mt-1">
                    {isCompleted ? (
                      <div className="p-2 bg-green-100 rounded-full">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                    ) : isInProgress ? (
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Play className="w-5 h-5 text-blue-600" />
                      </div>
                    ) : (
                      <div className="p-2 bg-gray-100 rounded-full">
                        <Circle className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground">
                        {t("lessonNumber", { number: index + 1 })}
                      </span>
                      {isCompleted && (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700"
                        >
                          {t("completed")}
                        </Badge>
                      )}
                      {isInProgress && (
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-700"
                        >
                          {t("inProgress")}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg mb-1">
                      {lessonTitle}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {lesson.estimated_minutes} {t("minutes")}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {t("withQuiz")}
                      </span>
                    </div>
                  </div>

                  {/* Action button */}
                  <Link
                    href={`/${locale}/kurs/${moduleSlug}/leksjon/${lesson.slug}`}
                  >
                    <Button
                      variant={isCompleted ? "outline" : "default"}
                      size="sm"
                    >
                      {isCompleted
                        ? t("reviewLesson")
                        : isInProgress
                          ? t("continueLesson")
                          : t("startLesson")}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Login prompt for non-logged in users */}
      {!user && (
        <Card
          className="mt-8 bg-muted/50"
          data-testid="course-module-login-prompt"
        >
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">{t("loginRequired")}</p>
            <Link href={`/${locale}/innlogging`}>
              <Button>{t("loginButton")}</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { locale, moduleSlug } = await params;
  const supabase = await createClient();

  const { data: module } = await supabase
    .from("course_modules")
    .select("title_no, title_en")
    .eq("slug", moduleSlug)
    .eq("is_published", true)
    .single();

  const t = await getTranslations("ModulePage");

  const title = module
    ? locale === "no"
      ? module.title_no
      : module.title_en
    : locale === "no"
      ? "Kurs"
      : "Course";

  return {
    title: t("metadataTitle", { title }),
    description: t("metadataDescription"),
  };
}
