import { createClient, createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  TrendingUp,
  BookOpen,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight,
  Award,
  Sparkles,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export const runtime = 'nodejs';

interface PageProps {
  params: Promise<{ locale: string }>;
}

interface CourseModule {
  id: string;
  slug: string;
  title_no: string;
  title_en: string;
  description_no: string | null;
  description_en: string | null;
  icon: string | null;
  difficulty: string | null;
  estimated_minutes: number | null;
  is_required: boolean | null;
  sort_order: number | null;
}

interface ModuleWithProgress extends CourseModule {
  lessonCount: number;
  completedCount: number;
  progressPercent: number;
  isCompleted: boolean;
  badge?: {
    badge_emoji: string;
    badge_label_no: string;
    badge_label_en: string;
    badge_description_no: string | null;
    badge_description_en: string | null;
    badge_color: string;
    earned: boolean;
    earned_at: string | null;
  } | null;
}

async function getCoursesWithDetails(userId?: string) {
  const supabase = await createClient();

  // Get all published modules with badges
  const { data: modules, error } = await supabase
    .from("course_modules")
    .select(`
      *,
      course_badges (
        badge_emoji,
        badge_label_no,
        badge_label_en,
        badge_description_no,
        badge_description_en,
        badge_color
      )
    `)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error || !modules) {
    console.error("Error fetching modules:", error);
    return [];
  }

  // Get user badges if logged in
  const userBadgeMap = new Map<string, { earned_at: string }>();
  if (userId) {
    const { data: userBadges } = await supabase
      .from("user_badges")
      .select("badge_id, earned_at, course_badges(module_id)")
      .eq("user_id", userId);

    if (userBadges) {
      for (const ub of userBadges) {
        const moduleId = (ub.course_badges as unknown as { module_id: string } | null)?.module_id;
        if (moduleId) {
          userBadgeMap.set(moduleId, { earned_at: ub.earned_at || "" });
        }
      }
    }
  }

  // For each module, get lesson counts and user progress
  const modulesWithProgress = await Promise.all(
    modules.map(async (module: CourseModule & {
      course_badges: {
        badge_emoji: string;
        badge_label_no: string;
        badge_label_en: string;
        badge_description_no: string | null;
        badge_description_en: string | null;
        badge_color: string;
      }[] | null;
    }) => {
      // Get all published lessons for this module
      const { data: lessons, error: lessonsError } = await supabase
        .from("course_lessons")
        .select("id")
        .eq("module_id", module.id)
        .eq("is_published", true);

      const lessonIds = lessons?.map((l) => l.id) || [];
      const lessonCount = lessonIds.length;

      // Get user progress for this module's lessons
      let completedCount = 0;
      if (userId && lessonIds.length > 0) {
        const { data: completed } = await supabase
          .from("user_lesson_progress")
          .select("lesson_id")
          .eq("user_id", userId)
          .eq("status", "completed")
          .in("lesson_id", lessonIds);
        completedCount = completed?.length || 0;
      }

      const progressPercent = lessonCount > 0
        ? Math.round((completedCount / lessonCount) * 100)
        : 0;
      const isCompleted = progressPercent === 100 && lessonCount > 0;

      // Build badge info
      const moduleBadge = module.course_badges?.[0] || null;
      const earnedBadge = moduleBadge && userId
        ? userBadgeMap.has(module.id)
        : false;
      const badge = moduleBadge
        ? {
            badge_emoji: moduleBadge.badge_emoji,
            badge_label_no: moduleBadge.badge_label_no,
            badge_label_en: moduleBadge.badge_label_en,
            badge_description_no: moduleBadge.badge_description_no,
            badge_description_en: moduleBadge.badge_description_en,
            badge_color: moduleBadge.badge_color,
            earned: earnedBadge,
            earned_at: userBadgeMap.get(module.id)?.earned_at || null,
          }
        : null;

      return {
        ...module,
        lessonCount,
        completedCount,
        progressPercent,
        isCompleted,
        badge,
      } as ModuleWithProgress;
    })
  );

  return modulesWithProgress;
}

const difficultyColors: Record<string, string> = {
  beginner: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  intermediate: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  advanced: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const difficultyGradients: Record<string, string> = {
  beginner: "from-emerald-600 to-teal-600",
  intermediate: "from-blue-600 to-indigo-600",
  advanced: "from-amber-500 to-purple-600",
};

export default async function KursPage({ params }: PageProps) {
  const { locale } = await params;

  const supabaseAuth = await createServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  const courses = await getCoursesWithDetails(user?.id);
  if (courses.length === 0) {
    notFound();
  }

  const t = await getTranslations("KursPage");

  const requiredCourses = courses.filter((c) => c.is_required);
  const optionalCourses = courses.filter((c) => !c.is_required);
  const allRequiredCompleted = requiredCourses.every((c) => c.isCompleted);
  const totalLessons = courses.reduce((sum, c) => sum + c.lessonCount, 0);
  const totalCompleted = courses.reduce((sum, c) => sum + c.completedCount, 0);

  const difficultyLabel = (diff: string | null) => {
    if (diff === "beginner") return t("beginner");
    if (diff === "intermediate") return t("intermediate");
    return t("advanced");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Klarpakke Akademi
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          {t("title")}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          {t("subtitle")}
        </p>

        {/* Stats */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-xl border shadow-sm">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="font-semibold">{totalLessons}</span>
            <span className="text-sm text-muted-foreground">{t("totalLessons")}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-xl border shadow-sm">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="font-semibold">
              {courses.reduce((sum, c) => sum + (c.estimated_minutes || 0), 0)}
            </span>
            <span className="text-sm text-muted-foreground">{t("totalMinutes")}</span>
          </div>
          {user && (
            <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-xl border shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="font-semibold">{totalCompleted}</span>
              <span className="text-sm text-muted-foreground">{t("completedLessons")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Required banner if not completed */}
      {user && !allRequiredCompleted && requiredCourses.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-8 flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-amber-800 dark:text-amber-200 text-sm">
            {t("requiredBanner")}
          </p>
        </div>
      )}

      {/* All courses */}
      <div className="space-y-8">
        {requiredCourses.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-semibold">{t("required")}</h2>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {requiredCourses.map((course) => (
                <CourseCard key={course.id} course={course} locale={locale} t={t} difficultyLabel={difficultyLabel} />
              ))}
            </div>
          </div>
        )}

        {optionalCourses.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-2xl font-semibold">{t("optional")}</h2>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {optionalCourses.map((course) => (
                <CourseCard key={course.id} course={course} locale={locale} t={t} difficultyLabel={difficultyLabel} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Login prompt */}
      {!user && (
        <Card className="mt-12 bg-muted/50">
          <CardContent className="p-8 text-center">
            <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t("loginTitle")}</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t("loginDescription")}
            </p>
            <Link href={`/${locale}/innlogging`}>
              <Button size="lg">
                {t("loginButton")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface CourseCardProps {
  course: ModuleWithProgress;
  locale: string;
  t: (key: string) => string;
  difficultyLabel: (diff: string | null) => string;
}

function CourseCard({ course, locale, t, difficultyLabel }: CourseCardProps) {
  const title = locale === "no" ? course.title_no : course.title_en;
  const description =
    locale === "no" ? course.description_no : course.description_en;

  return (
    <div
      className={`relative bg-card rounded-2xl border overflow-hidden shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
        course.isCompleted ? "border-emerald-300 dark:border-emerald-700" : ""
      }`}
    >
      {/* Gradient header bar */}
      <div className={`h-2 bg-gradient-to-r ${difficultyGradients[course.difficulty || "beginner"]}`} />

      <div className="p-6">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl">
              {course.badge?.earned ? course.badge.badge_emoji : (course.icon || "📚")}
            </div>
            <div>
              <h3 className="text-xl font-bold">{title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${difficultyColors[course.difficulty || "beginner"]}`}
                >
                  {difficultyLabel(course.difficulty)}
                </span>
              </div>
            </div>
          </div>

          {/* Completion badge */}
          {course.isCompleted && (
            <div className="shrink-0">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground mb-5 line-clamp-2">
            {description}
          </p>
        )}

        {/* Progress bar for logged-in users with progress */}
        {course.progressPercent > 0 && !course.isCompleted && (
          <div className="mb-5">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">{t("progress")}</span>
              <span className="font-medium">{course.progressPercent}%</span>
            </div>
            <Progress value={course.progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {course.completedCount} {t("of")} {course.lessonCount} {t("lessons")}
            </p>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-5 border-t pt-4">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{course.lessonCount} {t("lessons")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{course.estimated_minutes || 0} {t("minutes")}</span>
          </div>
        </div>

        {/* Badge preview (when earned or available) */}
        {course.badge && (
          <div
            className={`mb-5 p-3 rounded-xl border ${
              course.badge.earned
                ? "bg-gradient-to-br " + course.badge.badge_color + " border-transparent"
                : "bg-muted/30 border-dashed"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{course.badge.badge_emoji}</span>
              <div>
                <p className={`text-sm font-semibold ${course.badge.earned ? "text-white" : ""}`}>
                  {locale === "no" ? course.badge.badge_label_no : course.badge.badge_label_en}
                </p>
                <p className={`text-xs ${course.badge.earned ? "text-white/80" : "text-muted-foreground"}`}>
                  {course.badge.earned
                    ? t("badgeEarned")
                    : course.isCompleted
                      ? t("badgeAvailable")
                      : course.progressPercent > 0
                        ? t("badgeInProgress", { pct: course.progressPercent })
                        : t("badgeLocked")}
                </p>
              </div>
              {course.badge.earned && (
                <Award className="w-5 h-5 text-yellow-300 ml-auto shrink-0" />
              )}
            </div>
          </div>
        )}

        {/* CTA Button */}
        <Link href={`/${locale}/kurs/${course.slug}`}>
          <Button
            className="w-full"
            variant={course.isCompleted ? "outline" : "default"}
          >
            {course.isCompleted
              ? t("reviewCourse")
              : course.progressPercent > 0
                ? t("continue")
                : t("startCourse")}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations("KursPage");

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    openGraph: {
      title: t("metadataTitle"),
      description: t("metadataDescription"),
      type: "website",
      url: `https://www.klarpakke.no/${locale}/kurs`,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Klarpakke" }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("metadataTitle"),
      description: t("metadataDescription"),
    },
  };
}
