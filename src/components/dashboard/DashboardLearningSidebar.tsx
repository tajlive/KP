"use client";

/**
 * Dashboard Learning Sidebar - KLA-75
 * Visualiserer læringsløpet direkte i dashboardet
 * Viser progresjon, badges og anbefalte leksjoner
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Award,
  TrendingUp,
  ChevronRight,
  GraduationCap,
  Star,
  Target,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  LEARNING_TRACKS,
  getTrackById,
  calculateTrackProgress,
  getFirstIncompleteLesson,
  type LearningTrack,
  type LearningLesson,
} from "@/lib/learningTracks";
import { cn } from "@/lib/utils";

interface DashboardLearningSidebarProps {
  userId: string;
  completedLessonIds: string[];
  earnedBadges: UserBadge[];
  currentTrackId?: string;
}

interface UserBadge {
  id: string;
  trackId: string;
  label: string;
  description: string;
  earnedAt: string;
  icon: string;
}

// Nivå-navn mapping
const LEVEL_NAMES: Record<string, Record<string, string>> = {
  no: {
    beginner: "Student",
    intermediate: "Bachelor",
    advanced: "Master",
  },
  en: {
    beginner: "Student",
    intermediate: "Bachelor",
    advanced: "Master",
  },
};

// Ikon-mapping for badges
const BADGE_ICONS: Record<string, React.ReactNode> = {
  "badge-grunnkurs": <BookOpen className="w-4 h-4" />,
  "badge-risikostyring": <ShieldIcon />,
  "badge-teknisk-analyse": <TrendingUp className="w-4 h-4" />,
};

function ShieldIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default function DashboardLearningSidebar({
  userId,
  completedLessonIds,
  earnedBadges,
  currentTrackId = "grunnkurs-krypto",
}: DashboardLearningSidebarProps) {
  const { locale } = useParams<unknown>();
  const lang = (locale as string) || "no";

  // Beregn total progresjon på tvers av alle tracks
  const totalLessons = LEARNING_TRACKS.reduce((sum, track) => sum + track.lessons.length, 0);
  const totalCompleted = completedLessonIds.length;
  const totalProgress = Math.round((totalCompleted / totalLessons) * 100);

  // Finn nåværende track
  const currentTrack = getTrackById(currentTrackId) || LEARNING_TRACKS[0];
  const trackProgress = calculateTrackProgress(currentTrackId, completedLessonIds);

  // Finn neste anbefalte leksjon
  const nextLesson = getFirstIncompleteLesson(currentTrackId, completedLessonIds);

  // Beregn nivå basert på fullførte leksjoner
  const currentLevel = getCurrentLevel(totalCompleted, totalLessons);
  const levelName = LEVEL_NAMES[lang][currentLevel] || LEVEL_NAMES[lang].beginner;

  // Sorter tracks etter nivå
  const sortedTracks = [...LEARNING_TRACKS].sort((a, b) => {
    const levelOrder = { beginner: 0, intermediate: 1, advanced: 2 };
    return levelOrder[a.level] - levelOrder[b.level];
  });

  return (
    <div className="space-y-6">
      {/* Hovedkort - Nåværende nivå og progresjon */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-indigo-900/20 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">
                {lang === "en" ? "Learning Path" : "Læringsløp"}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === "en" ? "Level" : "Nivå"}: {levelName}
              </p>
            </div>
          </div>
          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
            {totalProgress}%
          </Badge>
        </div>

        {/* Total progresjonsbar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{totalCompleted} / {totalLessons} {lang === "en" ? "lessons" : "leksjoner"}</span>
            <span>{totalProgress}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${totalProgress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Neste anbefalte leksjon */}
        {nextLesson && (
          <div className="mt-6 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
            <p className="text-xs text-slate-400 uppercase font-bold mb-2">
              {lang === "en" ? "Continue where you left off" : "Fortsett der du slapp"}
            </p>
            <Link href={`/${locale}${nextLesson.href}`}>
              <div className="flex items-center gap-3 group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-lg">
                  {getLessonIcon(nextLesson.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
                    {nextLesson.title}
                  </p>
                  <p className="text-xs text-slate-400">
                    {nextLesson.estimatedMinutes} min • {currentTrack?.title}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          </div>
        )}
      </motion.div>

      {/* Tracks oversikt */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">
          {lang === "en" ? "Your Tracks" : "Dine Spor"}
        </h4>

        {sortedTracks.map((track, index) => {
          const progress = calculateTrackProgress(track.id, completedLessonIds);
          const isActive = track.id === currentTrackId;
          const isCompleted = progress.percentage === 100;

          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={`/${locale}/kurs/${track.slug}`}>
                <div
                  className={cn(
                    "group p-4 rounded-2xl border transition-all cursor-pointer",
                    isActive
                      ? "bg-slate-800 border-indigo-500/30"
                      : "bg-slate-900/50 border-slate-800 hover:border-slate-700",
                    isCompleted && "border-green-500/30"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
                          track.color.replace("bg-", "bg-opacity-20 bg-")
                        )}
                      >
                        {getTrackIcon(track.id)}
                      </div>
                      <div>
                        <h5 className="font-bold text-white text-sm">{track.title}</h5>
                        <p className="text-xs text-slate-500">
                          {progress.completed} / {progress.total} {lang === "en" ? "lessons" : "leksjoner"}
                        </p>
                      </div>
                    </div>
                    {isCompleted && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <Award className="w-3 h-3 mr-1" />
                        {lang === "en" ? "Done" : "Ferdig"}
                      </Badge>
                    )}
                  </div>

                  {/* Progresjonsbar for track */}
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className={cn(
                        "h-full rounded-full",
                        track.color
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.percentage}%` }}
                      transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                    />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Badges seksjon */}
      {earnedBadges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              {lang === "en" ? "Your Badges" : "Dine Badges"}
            </h4>
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              {earnedBadges.length}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            {earnedBadges.map((badge) => (
              <motion.div
                key={badge.id}
                whileHover={{ scale: 1.05 }}
                className="group relative"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 flex items-center justify-center cursor-pointer hover:border-yellow-400 transition-colors">
                  {BADGE_ICONS[badge.id] || <Star className="w-5 h-5 text-yellow-400" />}
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {badge.label}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* CTA til akademi */}
      <Link href={`/${locale}/akademi`}>
        <Button
          variant="ghost"
          className="w-full justify-between text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-2xl py-6 group"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {lang === "en" ? "Go to Academy" : "Gå til Akademiet"}
          </span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </Link>
    </div>
  );
}

// Hjelpefunksjoner
export function getCurrentLevel(completed: number, total: number): string {
  const percentage = total > 0 ? completed / total : 0;
  if (percentage >= 0.66) return "advanced";
  if (percentage >= 0.33) return "intermediate";
  return "beginner";
}

function getLessonIcon(type: string): React.ReactNode {
  switch (type) {
    case "article":
      return <BookOpen className="w-5 h-5 text-indigo-400" />;
    case "video":
      return <Zap className="w-5 h-5 text-yellow-400" />;
    case "quiz":
      return <Target className="w-5 h-5 text-green-400" />;
    case "simulator":
      return <TrendingUp className="w-5 h-5 text-blue-400" />;
    case "paper-trading":
      return <Award className="w-5 h-5 text-purple-400" />;
    default:
      return <BookOpen className="w-5 h-5 text-slate-400" />;
  }
}

function getTrackIcon(trackId: string): React.ReactNode {
  switch (trackId) {
    case "grunnkurs-krypto":
      return "📚";
    case "risikostyring":
      return "🛡️";
    case "teknisk-analyse":
      return "📊";
    default:
      return "🎓";
  }
}
