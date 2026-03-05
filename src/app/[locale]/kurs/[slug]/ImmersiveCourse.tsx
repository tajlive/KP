"use client";
/* global HTMLAudioElement, Audio */

import { VideoHero } from "@/components/course/VideoHero";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CourseDetails, Lesson } from "@/lib/courses";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Fullscreen,
  Lock,
  Mic,
  MicOff,
  Minimize,
  Pause,
  Play,
  PlayCircle,
  Sparkles,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ============================================
// 🎭 AI AVATAR MED "LIP SYNC" OG FØLELSER
// ============================================

interface AIEmotion {
  type:
    | "neutral"
    | "happy"
    | "excited"
    | "thinking"
    | "concerned"
    | "celebrating";
  intensity: number;
}

function AIProfessorAdvanced({
  isSpeaking,
  emotion,
  message,
  onClick,
  emotions,
}: {
  isSpeaking: boolean;
  emotion: AIEmotion;
  message: string;
  onClick: () => void;
  emotions: Record<string, string>;
}) {
  const mouthVariants = {
    neutral: { scaleY: 0.3 },
    speaking: {
      scaleY: [0.3, 1, 0.5, 1, 0.3],
      transition: { duration: 0.5, repeat: Infinity },
    },
    excited: {
      scaleY: [0.3, 1.2, 0.4, 1.1, 0.3],
      transition: { duration: 0.3, repeat: Infinity },
    },
  };

  const getEmotionColor = () => {
    switch (emotion.type) {
      case "happy":
        return "from-amber-400 to-orange-500";
      case "excited":
        return "from-pink-400 to-rose-500";
      case "thinking":
        return "from-blue-400 to-indigo-500";
      case "concerned":
        return "from-slate-400 to-gray-500";
      case "celebrating":
        return "from-yellow-400 to-amber-500";
      default:
        return "from-blue-500 to-emerald-500";
    }
  };

  const getEmotionEmoji = () => {
    switch (emotion.type) {
      case "happy":
        return emotions.happy;
      case "excited":
        return emotions.excited;
      case "thinking":
        return emotions.thinking;
      case "concerned":
        return emotions.concerned;
      case "celebrating":
        return emotions.celebrating;
      default:
        return emotions.neutral;
    }
  };

  return (
    <motion.div
      className="relative cursor-pointer"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Hologram rings */}
      <motion.div
        className={`absolute inset-0 rounded-full bg-gradient-to-r ${getEmotionColor()} opacity-20 blur-2xl`}
        animate={{
          rotate: 360,
          scale: emotion.type === "celebrating" ? [1, 1.3, 1] : [1, 1.1, 1],
        }}
        transition={{
          rotate: { duration: 10, repeat: Infinity, ease: "linear" },
          scale: { duration: 2, repeat: Infinity },
        }}
      />

      {/* Avatar container */}
      <div className="relative w-32 h-32">
        {/* Main avatar */}
        <Avatar className="w-full h-full border-4 border-white/20 shadow-2xl">
          <AvatarImage src="/ai-professor-3d.png" />
          <AvatarFallback
            className={`bg-gradient-to-br ${getEmotionColor()} text-white text-4xl`}
          >
            {getEmotionEmoji()}
          </AvatarFallback>
        </Avatar>

        {/* Animated mouth */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 w-6 h-3 bg-white rounded-full"
          variants={mouthVariants}
          animate={isSpeaking ? "speaking" : "neutral"}
        />

        {/* Emotion particles */}
        <AnimatePresence>
          {emotion.type === "celebrating" && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute top-0 left-1/2 w-2 h-2 bg-yellow-400 rounded-full"
                  initial={{ y: 0, opacity: 1 }}
                  animate={{
                    y: -40,
                    x: (i - 3) * 15,
                    opacity: 0,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Speech bubble */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 p-3 bg-slate-800/90 backdrop-blur rounded-2xl border border-white/10 shadow-xl"
          >
            <p className="text-sm text-white text-center">{message}</p>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-800/90 rotate-45 border-r border-b border-white/10" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// 📊 INTERAKTIV FREMGANGSSTI
// ============================================

function ProgressPath({
  lessons,
  currentIndex,
  onSelect,
}: {
  lessons: Array<{
    id: number;
    title: string;
    status: string;
    progress: number;
  }>;
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="relative">
      {/* Path line */}
      <div className="absolute top-8 left-0 right-0 h-1 bg-slate-800 rounded-full">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(currentIndex / (lessons.length - 1)) * 100}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>

      {/* Lesson nodes */}
      <div className="relative flex justify-between">
        {lessons.map((lesson, index) => {
          const isCompleted = lesson.status === "completed";
          const isCurrent = lesson.status === "current";
          const isLocked = lesson.status === "locked";

          return (
            <motion.button
              key={lesson.id}
              onClick={() => !isLocked && onSelect(index)}
              className={`relative flex flex-col items-center gap-2 ${isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              whileHover={!isLocked ? { scale: 1.1 } : {}}
              whileTap={!isLocked ? { scale: 0.95 } : {}}
            >
              {/* Node */}
              <motion.div
                className={`relative w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold
                  ${isCompleted ? "bg-green-500 text-white" : ""}
                  ${isCurrent ? "bg-gradient-to-r from-blue-500 to-emerald-500 text-white ring-4 ring-blue-500/30" : ""}
                  ${isLocked ? "bg-slate-800 text-slate-500" : ""}
                  ${lesson.status === "available" ? "bg-slate-700 text-white hover:bg-slate-600" : ""}
                `}
                animate={
                  isCurrent
                    ? {
                        boxShadow: [
                          "0 0 0 0 rgba(59, 130, 246, 0)",
                          "0 0 0 10px rgba(59, 130, 246, 0.3)",
                          "0 0 0 0 rgba(59, 130, 246, 0)",
                        ],
                      }
                    : {}
                }
                transition={{ duration: 2, repeat: Infinity }}
              >
                {isCompleted && <CheckCircle2 className="w-8 h-8" />}
                {isCurrent && <Sparkles className="w-8 h-8" />}
                {isLocked && <Lock className="w-6 h-6" />}
                {lesson.status === "available" && (
                  <PlayCircle className="w-8 h-8" />
                )}

                {/* Progress ring for current */}
                {isCurrent && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="30"
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="2"
                    />
                    <motion.circle
                      cx="32"
                      cy="32"
                      r="30"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 30}`}
                      initial={{ strokeDashoffset: `${2 * Math.PI * 30}` }}
                      animate={{
                        strokeDashoffset: `${2 * Math.PI * 30 * (1 - lesson.progress / 100)}`,
                      }}
                      transition={{ duration: 1 }}
                    />
                  </svg>
                )}
              </motion.div>

              {/* Label */}
              <span
                className={`text-xs font-medium text-center max-w-[80px] ${
                  isCurrent ? "text-blue-400" : "text-slate-400"
                }`}
              >
                {lesson.title}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// 🧠 HOVEDKOMPONENT
// ============================================

interface ImmersiveCourseProps {
  courseId: string;
  courseData: CourseDetails;
}

export default function ImmersiveCourse({
  courseId, // eslint-disable-line @typescript-eslint/no-unused-vars
  courseData,
}: ImmersiveCourseProps) {
  const locale = useLocale();
  const [activeLesson, setActiveLesson] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [xp, setXp] = useState(1250);
  const [streak, setStreak] = useState(5);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [professorMessage, setProfessorMessage] = useState(
    courseData.aiProfessor.messages.initial,
  );
  const [professorEmotion, setProfessorEmotion] = useState<AIEmotion>({
    type: "happy",
    intensity: 0.8,
  });

  // Get current lesson
  const currentLesson =
    courseData.lessonsList[activeLesson] || courseData.lessonsList[0];
  const lessonContent =
    ((courseData.lessonContent as any)[String(currentLesson?.id)] as Lesson) ||
    ((courseData.lessonContent as any)["1"] as Lesson);

  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync audio with isPlaying
  useEffect(() => {
    if (
      !audioRef.current &&
      typeof Audio !== "undefined" &&
      lessonContent?.audioUrl
    ) {
      audioRef.current = new Audio(lessonContent.audioUrl);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setProfessorEmotion({ type: "happy", intensity: 0.8 });
      };
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current
          .play()
          .catch((err) => console.error("Audio play failed:", err));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, lessonContent?.audioUrl]);

  // Cleanup audio
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Sync mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Handlers
  const handleAnswer = (isCorrect: boolean) => {
    if (isCorrect) {
      setXp((prev) => prev + 50);
      setStreak((prev) => prev + 1);
      setProfessorEmotion({ type: "celebrating", intensity: 1 });
      setProfessorMessage(courseData.aiProfessor.messages.correctAnswer);
      toast.success(courseData.aiProfessor.messages.correctAnswer, {
        icon: "🎉",
      });
    } else {
      setStreak(0);
      setProfessorEmotion({ type: "concerned", intensity: 0.6 });
      setProfessorMessage(courseData.aiProfessor.messages.wrongAnswer);
    }

    setTimeout(() => {
      setProfessorEmotion({ type: "happy", intensity: 0.8 });
      setProfessorMessage(courseData.aiProfessor.messages.nextQuestion);
    }, 3000);
  };

  const toggleVoice = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        setVoiceTranscript(courseData.aiProfessor.messages.voiceTranscript);
        setIsListening(false);
        setProfessorEmotion({ type: "thinking", intensity: 0.7 });
        setProfessorMessage(courseData.aiProfessor.messages.voiceAnswer);
      }, 3000);
    } else {
      setVoiceTranscript("");
    }
  };

  return (
    <div
      className={`
      min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white
      ${isFullscreen ? "fixed inset-0 z-50" : ""}
    `}
    >
      {/* Animated ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-3xl"
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto p-4 pt-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-white/10"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{courseData.title}</h1>
              <p className="text-sm text-slate-400">
                {courseData.weeks}-{locale === "no" ? "ukers" : "week"}{" "}
                {locale === "no" ? "kurs" : "course"} • {courseData.labels.week}{" "}
                {Math.floor(activeLesson / 2) + 1} {courseData.labels.of}{" "}
                {courseData.weeks}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <motion.div
              className="flex items-center gap-2 bg-orange-500/20 px-4 py-2 rounded-full"
              whileHover={{ scale: 1.05 }}
            >
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-bold">{streak} 🔥</span>
            </motion.div>
            <motion.div
              className="flex items-center gap-2 bg-blue-500/20 px-4 py-2 rounded-full"
              whileHover={{ scale: 1.05 }}
            >
              <Zap className="w-5 h-5 text-blue-400" />
              <span className="font-bold">
                {xp} {courseData.achievements.xpLabel}
              </span>
            </motion.div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Fullscreen className="w-5 h-5" />
              )}
            </Button>
          </div>
        </header>

        {/* Progress Path */}
        <Card className="p-6 mb-6 bg-slate-900/50 backdrop-blur-xl border-white/10">
          <ProgressPath
            lessons={courseData.lessonsList}
            currentIndex={activeLesson}
            onSelect={setActiveLesson}
          />
        </Card>

        {/* Video Hero - Responsive med mobil-optimalisering */}
        <div className="mb-6 md:mb-8">
          <VideoHero
            title={courseData.videoTitle}
            subtitle={courseData.videoSubtitle}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-8">
            {/* AI Professor & Interaction */}
            <Card className="p-6 md:p-8 bg-slate-900/50 backdrop-blur-xl border-white/10">
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                {/* AI Avatar */}
                <div className="flex-shrink-0">
                  <AIProfessorAdvanced
                    isSpeaking={isPlaying}
                    emotion={professorEmotion}
                    message={professorMessage}
                    onClick={() => {
                      setIsPlaying(!isPlaying);
                      setProfessorEmotion(
                        isPlaying
                          ? { type: "happy", intensity: 0.8 }
                          : { type: "excited", intensity: 0.9 },
                      );
                    }}
                    emotions={courseData.aiProfessor.emotions}
                  />
                </div>

                {/* Interaction Area */}
                <div className="flex-1 text-center md:text-left space-y-4 min-w-0">
                  <h2 className="text-2xl font-bold">
                    {lessonContent?.title || "Lesson"}
                  </h2>
                  <p className="text-slate-400">
                    {lessonContent?.description || ""}
                  </p>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <Button
                      size="lg"
                      className="rounded-full px-6 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-5 h-5 mr-2" />{" "}
                          {lessonContent?.buttons?.pause || "Pause"}
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5 mr-2" />{" "}
                          {lessonContent?.buttons?.start || "Start"}
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      className="rounded-full border-white/20 hover:bg-white/10"
                      onClick={() => setIsMuted(!isMuted)}
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5 mr-2" />
                      ) : (
                        <Volume2 className="w-5 h-5 mr-2" />
                      )}
                      {isMuted
                        ? lessonContent?.buttons?.mute || "Mute"
                        : lessonContent?.buttons?.unmute || "Unmute"}
                    </Button>
                  </div>

                  {/* Voice interaction */}
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-sm text-slate-400 mb-2">
                      {courseData.voiceInteraction.title}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`rounded-full ${isListening ? "bg-red-500/20 text-red-400 animate-pulse" : ""}`}
                      onClick={toggleVoice}
                    >
                      {isListening ? (
                        <MicOff className="w-4 h-4 mr-2" />
                      ) : (
                        <Mic className="w-4 h-4 mr-2" />
                      )}
                      {isListening
                        ? courseData.voiceInteraction.buttonListening
                        : courseData.voiceInteraction.button}
                    </Button>

                    <AnimatePresence>
                      {voiceTranscript && (
                        <motion.p
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-2 text-sm text-blue-400"
                        >
                          "{voiceTranscript}"
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quiz Section */}
            <Card className="p-6 md:p-8 bg-slate-900/50 backdrop-blur-xl border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    {locale === "no"
                      ? "Test kunnskapen din"
                      : "Test your knowledge"}
                  </h3>
                  <p className="text-slate-400">{courseData.quiz.question}</p>
                </div>
              </div>

              <div className="space-y-3">
                {courseData.quiz.options.map((option, index) => (
                  <motion.button
                    key={index}
                    onClick={() =>
                      handleAnswer(index === courseData.quiz.correctAnswer)
                    }
                    className="w-full p-4 text-left bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-white/10 hover:border-blue-500/50 transition-all group"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-slate-700 group-hover:bg-blue-500 rounded-lg flex items-center justify-center font-bold text-sm transition-colors">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-1">{option}</span>
                      <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                  </motion.button>
                ))}
              </div>

              <motion.div
                className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-300 mb-1">
                      {locale === "no"
                        ? "Visste du at...?"
                        : "Did you know...?"}
                    </p>
                    <p className="text-sm text-slate-400">
                      {courseData.quiz.funFact}
                    </p>
                  </div>
                </div>
              </motion.div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Achievements */}
            <Card className="p-6 bg-slate-900/50 backdrop-blur-xl border-white/10">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                {courseData.achievements.title}
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {xp} {courseData.achievements.xpLabel}
                      </p>
                      <p className="text-xs text-slate-400">
                        {locale === "no" ? "Totalt opptjent" : "Total earned"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <Flame className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {streak} {locale === "no" ? "dager" : "days"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {courseData.achievements.streakLabel}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium">3/12</p>
                      <p className="text-xs text-slate-400">
                        {locale === "no"
                          ? "Fullførte leksjoner"
                          : "Completed lessons"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Course Stats */}
            <Card className="p-6 bg-slate-900/50 backdrop-blur-xl border-white/10">
              <h3 className="text-lg font-bold mb-4">
                {locale === "no" ? "Kursinfo" : "Course Info"}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-slate-400">
                  <Target className="w-4 h-4" />
                  <span>
                    {courseData.labels.level}: {courseData.levelLabel}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span>{courseData.duration}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <BookOpen className="w-4 h-4" />
                  <span>
                    {courseData.lessons} {courseData.labels.modules}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
