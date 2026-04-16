import { createClient, createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  TrendingUp,
  BookOpen,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { getTranslations } from "next-intl/server";

interface PageProps {
  params: Promise<{ locale: string }>;
}

async function getModulesWithProgress(userId?: string) {
  const supabase = await createClient();

  // Get all published modules
  const { data: modules, error } = await supabase
    .from("course_modules")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error || !modules) {
    return [];
  }

  // If no user, return modules without progress
  if (!userId) {
    return modules.map((m) => ({ ...m, progress: 0, completed: false }));
  }

  // Get progress for each module
  const modulesWithProgress = await Promise.all(
    modules.map(async (module) => {
      // Get all lessons in module
      const { data: lessons } = await supabase
        .from("course_lessons")
        .select("id")
        .eq("module_id", module.id)
        .eq("is_published", true);

      const lessonIds = lessons?.map((l) => l.id) || [];

      if (lessonIds.length === 0) {
        return { ...module, progress: 0, completed: false };
      }

      // Get completed lessons
      const { data: completed } = await supabase
        .from("user_lesson_progress")
        .select("lesson_id")
        .eq("user_id", userId)
        .eq("status", "completed")
        .in("lesson_id", lessonIds);

      const completedCount = completed?.length || 0;
      const progress = Math.round((completedCount / lessonIds.length) * 100);

      return {
        ...module,
        progress,
        completed: progress === 100,
      };
    })
  );

  return modulesWithProgress;
}

export default async function KursPage({ params }: PageProps) {
  const { locale } = await params;

  const supabaseAuth = await createServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  const modules = await getModulesWithProgress(user?.id);

  const t = await getTranslations("KursPage");

  const requiredModules = modules.filter((m) => m.is_required);
  const optionalModules = modules.filter((m) => !m.is_required);

  // Check if all required modules are completed
  const allRequiredCompleted = requiredModules.every((m) => m.completed);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{t("title")}</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {t("subtitle")}
        </p>
      </div>

      {/* Required banner if not completed */}
      {user && !allRequiredCompleted && requiredModules.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-8 flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-600" />
          <p className="text-amber-800 dark:text-amber-200">{t("requiredBanner")}</p>
        </div>
      )}

      {/* Required modules */}
      {requiredModules.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-semibold">{t("required")}</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {requiredModules.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                locale={locale}
                t={t}
              />
            ))}
          </div>
        </div>
      )}

      {/* Optional modules */}
      {optionalModules.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-2xl font-semibold">{t("optional")}</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {optionalModules.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                locale={locale}
                t={t}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {modules.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {t("noCourses")}
          </p>
        </div>
      )}
    </div>
  );
}

interface ModuleCardProps {
  module: {
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
    progress: number;
    completed: boolean;
  };
  locale: string;
  t: any;
}

function ModuleCard({ module, locale, t }: ModuleCardProps) {
  const title = locale === "no" ? module.title_no : module.title_en;
  const description =
    (locale === "no" ? module.description_no : module.description_en) || "";

  const difficultyColor =
    module.difficulty === "beginner"
      ? "bg-green-100 text-green-700"
      : module.difficulty === "intermediate"
        ? "bg-blue-100 text-blue-700"
        : "bg-purple-100 text-purple-700";

  const difficultyLabel =
    module.difficulty === "beginner"
      ? t("beginner")
      : module.difficulty === "intermediate"
        ? t("intermediate")
        : t("advanced");

  return (
    <Card className={`${module.completed ? "border-green-200" : ""}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              {module.completed && (
                <Badge
                  variant="secondary"
                  className="mt-1 bg-green-100 text-green-700"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {t("completed")}
                </Badge>
              )}
            </div>
          </div>
          <Badge className={difficultyColor}>{difficultyLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {description}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>
              {module.estimated_minutes} {t("minutes")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            <span>{module.progress}%</span>
          </div>
        </div>

        <Link href={`/${locale}/kurs/${module.slug}`}>
          <Button
            className="w-full"
            variant={module.completed ? "outline" : "default"}
          >
            {module.completed
              ? t("completed")
              : module.progress > 0
                ? t("continue")
                : t("startModule")}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
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
