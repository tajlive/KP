import Link from "next/link";
import { Lock, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CourseGateProps {
  locale: string;
  moduleSlug: string;
  moduleTitle: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
}

export function CourseGate({
  locale,
  moduleSlug,
  moduleTitle,
  progress,
  completedLessons,
  totalLessons,
}: CourseGateProps) {
  const t = {
    title: locale === "no" ? "Paper Trading Låst" : "Paper Trading Locked",
    description:
      locale === "no"
        ? "Fullfør det obligatoriske kurset for å låse opp paper trading"
        : "Complete the required course to unlock paper trading",
    requiredCourse:
      locale === "no" ? "Obligatorisk kurs" : "Required course",
    progress: locale === "no" ? "Fremgang" : "Progress",
    lessonsCompleted:
      locale === "no"
        ? `${completedLessons} av ${totalLessons} leksjoner fullført`
        : `${completedLessons} of ${totalLessons} lessons completed`,
    startCourse: locale === "no" ? "Start kurset" : "Start course",
    continueCourse: locale === "no" ? "Fortsett kurset" : "Continue course",
  };

  return (
    <Card className="mb-6 border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-lg">{t.title}</CardTitle>
            <CardDescription>{t.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">{moduleTitle}</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {t.requiredCourse}
              </p>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t.progress}</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {t.lessonsCompleted}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Link href={`/${locale}/kurs/${moduleSlug}`}>
              <Button>
                {progress > 0 ? t.continueCourse : t.startCourse}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
