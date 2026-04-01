"use client";

/**
 * Get Started Card - KLA-73
 * Viser nyttige lenker for nye brukere i dashboardet
 * Skjules etter 3 fullførte leksjoner eller når bruker dismisser
 */

import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { X, BookOpen, TrendingUp, BarChart3, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/utils";

interface GetStartedCardProps {
  userId: string;
  completedLessons: string[];
  onDismiss?: () => void;
}

interface GetStartedItem {
  id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  duration: string;
  icon: React.ReactNode;
  href: string;
  completed: boolean;
}

// TESTPLAN KLA-73: 3 korte lenker for nye brukere
const getStartedItems: Omit<GetStartedItem, "completed">[] = [
  {
    id: "auto-trading-intro",
    title: {
      no: "Hva er automatisk trading?",
      en: "What is automated trading?",
    },
    description: {
      no: "Lær grunnleggende om hvordan vår trading-bot fungerer",
      en: "Learn the basics of how our trading bot works",
    },
    duration: "5 min",
    icon: <BookOpen className="w-5 h-5 text-blue-400" />,
    href: "/kurs/grunnleggende/leksjon/introduksjon-til-krypto",
  },
  {
    id: "dca-strategy",
    title: {
      no: "Forstå DCA-strategien",
      en: "Understand the DCA strategy",
    },
    description: {
      no: "Dollar-Cost Averaging: Den tryggeste måten å bygge posisjoner",
      en: "Dollar-Cost Averaging: The safest way to build positions",
    },
    duration: "7 min",
    icon: <TrendingUp className="w-5 h-5 text-green-400" />,
    href: "/kurs/strategi/leksjon/dollar-cost-averaging",
  },
  {
    id: "dashboard-numbers",
    title: {
      no: "Slik leser du dashboard-tallene",
      en: "How to read dashboard numbers",
    },
    description: {
      no: "Forstå P&L, win rate, og andre viktige målinger",
      en: "Understand P&L, win rate, and other important metrics",
    },
    duration: "5 min",
    icon: <BarChart3 className="w-5 h-5 text-purple-400" />,
    href: "/akademi/dashboard-guide",
  },
];

export function shouldShowGetStartedCard(
  completedLessons: string[],
  dismissed: boolean,
  minLessonsCompleted: number = 3
): boolean {
  if (dismissed) return false;
  if (completedLessons.length < minLessonsCompleted) return true;
  return false;
}

export default function GetStartedCard({
  userId,
  completedLessons,
  onDismiss,
}: GetStartedCardProps) {
  const { locale } = useParams();
  const lang = (locale as string) || "no";
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // KRITISK: isMounted guard for å unngå React #418 hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sjekk om bruker tidligere har dismissed kortet
  useEffect(() => {
    const checkDismissed = async () => {
      try {
        const supabase = createClient();
        // DEFENSIV: Håndter case hvor kolonne mangler eller er null
        const { data, error } = await supabase
          .from("user_profiles")
          .select("dismissed_get_started_card")
          .eq("id", userId)
          .maybeSingle();

        // Hvis feil eller ingen data, ikke kast — behandle som ikke-avvist
        if (error) {
          console.warn("[GetStarted] Kunne ikke hente dismissed-status:", error.message);
          setIsLoading(false);
          return;
        }

        if (data?.dismissed_get_started_card) {
          setIsDismissed(true);
          setIsVisible(false);
        }
      } catch (error) {
        // Defensiv: ikke kast feil, bare logg
        console.warn("[GetStarted] Feil ved sjekk av dismissed status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (mounted) {
      checkDismissed();
    }
  }, [userId, mounted]);

  // Sjekk om kortet skal vises
  const shouldShow = shouldShowGetStartedCard(completedLessons, isDismissed);

  useEffect(() => {
    if (!shouldShow && !isLoading) {
      setIsVisible(false);
    }
  }, [shouldShow, isLoading]);

  const handleDismiss = useCallback(async () => {
    setIsVisible(false);
    setIsDismissed(true);

    // Lagre i databasen (defensivt)
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("user_profiles")
        .update({ dismissed_get_started_card: true })
        .eq("id", userId);
      
      if (error) {
        console.warn("[GetStarted] Kunne ikke lagre dismissed-status:", error.message);
      }
    } catch (error) {
      console.warn("[GetStarted] Feil ved lagring av dismissed status:", error);
    }

    onDismiss?.();
  }, [userId, onDismiss]);

  // Beregn progresjon
  const completedCount = getStartedItems.filter((item) =>
    completedLessons.includes(item.id)
  ).length;
  const progress = Math.round((completedCount / getStartedItems.length) * 100);

  // KRITISK: Unngå React #418 — vis ingenting før mounted
  if (!mounted || !isVisible || isLoading) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-linear-to-br from-blue-900/20 via-slate-900 to-slate-900 border-blue-500/20 rounded-3xl overflow-hidden shadow-xl relative">
            {/* Progress bar på toppen */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
              <motion.div
                className="h-full bg-linear-to-r from-blue-500 to-blue-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            </div>

            <CardHeader className="pb-2 pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">🚀</span>
                    {lang === "en" ? "Get Started" : "Kom i gang"}
                  </CardTitle>
                  <p className="text-slate-400 text-sm mt-1">
                    {lang === "en"
                      ? `Complete these ${getStartedItems.length} steps to master trading`
                      : `Fullfør disse ${getStartedItems.length} stegene for å mestre trading`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"
                  aria-label={lang === "en" ? "Dismiss" : "Lukk"}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {getStartedItems.map((item, index) => {
                const isCompleted = completedLessons.includes(item.id);
                return (
                  <Link key={item.id} href={`/${locale}${item.href}`}>
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`
                        group flex items-center gap-4 p-4 rounded-2xl 
                        transition-all duration-200 cursor-pointer
                        ${
                          isCompleted
                            ? "bg-green-500/10 border border-green-500/20"
                            : "bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600"
                        }
                      `}
                    >
                      {/* Ikon */}
                      <div
                        className={`
                        w-12 h-12 rounded-xl flex items-center justify-center
                        ${isCompleted ? "bg-green-500/20" : "bg-slate-700"}
                      `}
                      >
                        {isCompleted ? (
                          <svg
                            className="w-6 h-6 text-green-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          item?.icon || null
                        )}
                      </div>

                      {/* Innhold */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`
                            font-bold text-sm truncate
                            ${isCompleted ? "text-green-400 line-through" : "text-white"}
                          `}
                          >
                            {item.title[lang as keyof typeof item.title] || item.title.no}
                          </h4>
                          {!isCompleted && (
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              {item.duration}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">
                          {item.description[lang as keyof typeof item.description] || item.description.no}
                        </p>
                      </div>

                      {/* Pil eller checkmark */}
                      <div className="text-slate-500 group-hover:text-white transition-colors">
                        {isCompleted ? (
                          <span className="text-xs text-green-400 font-medium">
                            {lang === "en" ? "Done" : "Ferdig"}
                          </span>
                        ) : (
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        )}
                      </div>
                    </motion.div>
                  </Link>
                );
              })}

              {/* CTA */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-500">
                  {completedCount}/{getStartedItems.length}{" "}
                  {lang === "en" ? "completed" : "fullført"}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-slate-400 hover:text-slate-300 text-xs"
                >
                  {lang === "en" ? "I'll do this later" : "Jeg tar det senere"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
