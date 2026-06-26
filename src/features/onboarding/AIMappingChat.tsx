"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Sparkles } from "lucide-react";

const QUESTIONS = [
  { id: "goal", options: ["sparing", "vekst", "trading"] },
  { id: "timeHorizon", options: ["under1ar", "1til3ar", "over3ar"] },
] as const;

export interface AIMappingAnswers {
  goal: string;
  timeHorizon: string;
}

interface AIMappingChatProps {
  onComplete: (answers: AIMappingAnswers) => void;
  onSkip?: () => void;
}

export function AIMappingChat({ onComplete, onSkip }: AIMappingChatProps) {
  const t = useTranslations("onboarding.aiMapping");
  const reduceMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<AIMappingAnswers>>({});
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const currentQuestion = QUESTIONS[currentIndex];
  const isLastQuestion = currentIndex === QUESTIONS.length - 1;
  const allAnswered =
    answers.goal !== undefined && answers.timeHorizon !== undefined;

  const handleSelect = (option: string) => {
    const questionId = currentQuestion.id;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));

    if (!isLastQuestion) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, reduceMotion ? 0 : 250);
    }
  };

  const handleContinue = () => {
    if (allAnswered) {
      onComplete(answers as AIMappingAnswers);
    }
  };

  const containerVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: reduceMotion ? 0 : 16 },
      visible: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: reduceMotion ? 0 : -8 },
    }),
    [reduceMotion],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* AI Coach intro */}
      <Card
        className="gap-4 border-[var(--kp-ai)]/20 bg-[var(--kp-bg-secondary)] p-5"
        style={{
          borderColor: "color-mix(in srgb, var(--kp-ai) 20%, transparent)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{
              background:
                "color-mix(in srgb, var(--kp-ai) 15%, transparent)",
            }}
          >
            <Sparkles
              className="h-5 w-5"
              style={{ color: "var(--kp-ai)" }}
              aria-hidden="true"
            />
          </div>
          <div>
            <p
              className="font-semibold"
              style={{ color: "var(--kp-text-primary)" }}
            >
              {t("coachName")}
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--kp-text-secondary)" }}
            >
              {t("subtitle")}
            </p>
          </div>
        </div>
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--kp-text-primary)" }}
        >
          {t("title")}
        </h1>
      </Card>

      {/* Chat thread */}
      <div className="flex flex-col gap-4" aria-live="polite" aria-atomic="true">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={currentQuestion.id}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{
              duration: reduceMotion ? 0 : 0.25,
              ease: "easeOut",
            }}
            className="flex flex-col gap-4"
          >
            {/* Question bubble */}
            <div className="flex items-start gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{
                  background:
                    "color-mix(in srgb, var(--kp-ai) 15%, transparent)",
                }}
              >
                <Sparkles
                  className="h-4 w-4"
                  style={{ color: "var(--kp-ai)" }}
                  aria-hidden="true"
                />
              </div>
              <Card
                className="gap-0 rounded-2xl rounded-tl-none px-4 py-3"
                style={{
                  background:
                    "color-mix(in srgb, var(--kp-ai) 8%, var(--kp-bg-secondary))",
                  borderColor:
                    "color-mix(in srgb, var(--kp-ai) 20%, transparent)",
                }}
              >
                <p
                  className="text-sm font-medium sm:text-base"
                  style={{ color: "var(--kp-text-primary)" }}
                >
                  {t(`questions.${currentQuestion.id}.label`)}
                </p>
              </Card>
            </div>

            {/* Quick reply options */}
            <div className="flex flex-wrap gap-2 pl-11">
              {currentQuestion.options.map((option) => {
                const isSelected = answers[currentQuestion.id] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className="min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kp-ai)]"
                    style={{
                      borderColor: isSelected
                        ? "var(--kp-primary)"
                        : "var(--kp-border)",
                      background: isSelected
                        ? "var(--kp-bg-secondary)"
                        : "var(--kp-bg-secondary)",
                      color: isSelected
                        ? "var(--kp-text-primary)"
                        : "var(--kp-text-primary)",
                    }}
                    aria-pressed={isSelected}
                  >
                    {t(`questions.${currentQuestion.id}.options.${option}.label`)}
                  </button>
                );
              })}
            </div>
          </m.div>
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-2">
        <Button
          onClick={handleContinue}
          disabled={!allAnswered}
          size="lg"
          className="h-12 w-full text-base font-semibold"
        >
          {t("cta")}
        </Button>
        {onSkip && (
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            className="mx-auto min-h-[44px] text-sm font-medium text-[var(--kp-text-secondary)] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kp-ai)]"
          >
            {t("skip")}
          </Button>
        )}
      </div>
    </div>
  );
}
