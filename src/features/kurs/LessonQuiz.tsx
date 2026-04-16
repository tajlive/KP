"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ChevronRight, Trophy, RotateCcw } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useTranslations } from "next-intl";
import { submitQuizAnswer } from "@/lib/courses/actions";
import { cn } from "@/lib/utils";

interface QuizOption {
  id: string;
  text_no: string;
  text_en: string;
}

interface QuizQuestion {
  id: string;
  question_no: string;
  question_en: string;
  options: QuizOption[];
  correct_option_id: string;
  explanation_no: string;
  explanation_en: string;
}

interface LessonQuizProps {
  questions: QuizQuestion[];
  lessonId: string;
  userId: string;
  locale: string;
  onComplete?: () => Promise<void>;
}

export function LessonQuiz({
  questions,
  lessonId,
  userId,
  locale, // Keeping for props compatibility but mostly unused now for strings
  onComplete,
}: LessonQuizProps) {
  const t = useTranslations("LessonQuiz");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [passed, setPassed] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  const handleSubmit = async () => {
    if (!selectedOption) return;

    try {
      const result = await submitQuizAnswer(
        userId,
        currentQuestion.id,
        selectedOption
      );

      setIsCorrect(result.isCorrect);
      setIsSubmitted(true);

      if (result.isCorrect) {
        setScore((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
    }
  };

  const handleNext = async () => {
    if (isLastQuestion) {
      // Calculate final score
      const finalScore = isCorrect ? score + 1 : score;
      const percentage = (finalScore / questions.length) * 100;
      const hasPassed = percentage >= 80;

      setPassed(hasPassed);
      setIsFinished(true);

      if (hasPassed && onComplete) {
        await onComplete();
      }
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
      setIsCorrect(null);
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setIsCorrect(null);
    setScore(0);
    setIsFinished(false);
    setPassed(false);
  };

  // Show results when finished
  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    
    return (
      <div className="bg-card border rounded-lg p-6 mt-8">
        <div className="text-center py-6">
          {passed ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-green-700 mb-2">
                {t("congratulations")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("passedMessage", { percentage, score, total: questions.length })}
              </p>
              <p className="text-sm text-green-600">
                {t("lessonCompleted")}
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-2xl font-bold text-yellow-700 mb-2">
                {t("failed")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("failedMessage", { percentage, score, total: questions.length })}
              </p>
              <Button onClick={handleRetry} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                {t("tryAgain")}
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const questionText =
    locale === "no" ? currentQuestion.question_no : currentQuestion.question_en;
  const explanationText =
    locale === "no"
      ? currentQuestion.explanation_no
      : currentQuestion.explanation_en;

  const progressText = t("progress", { current: currentIndex + 1, total: questions.length });
  const scoreText = t("score", { score });

  return (
    <div className="bg-card border rounded-lg p-6 mt-8">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">{progressText}</span>
        <span className="text-sm font-medium">{scoreText}</span>
      </div>

      <h3 className="text-lg font-semibold mb-4">{questionText}</h3>

      <div className="space-y-3">
        {currentQuestion.options.map((option) => {
          const isSelected = selectedOption === option.id;
          const isCorrectOption = option.id === currentQuestion.correct_option_id;
          
          return (
            <button
              key={option.id}
              onClick={() => !isSubmitted && setSelectedOption(option.id)}
              disabled={isSubmitted}
              className={cn(
                "w-full text-left p-4 rounded-lg border transition-all",
                isSelected && !isSubmitted && "border-primary bg-primary/5",
                isSubmitted &&
                  isSelected &&
                  isCorrect &&
                  "border-green-500 bg-green-50 dark:bg-green-950/20",
                isSubmitted &&
                  isSelected &&
                  !isCorrect &&
                  "border-red-500 bg-red-50 dark:bg-red-950/20",
                isSubmitted &&
                  !isSelected &&
                  isCorrectOption &&
                  "border-green-500 bg-green-50/50 dark:bg-green-950/10",
                isSubmitted &&
                  !isSelected &&
                  !isCorrectOption &&
                  "opacity-50",
                !isSelected && !isSubmitted && "hover:bg-accent"
              )}
            >
              <div className="flex items-center gap-3">
                {isSubmitted && isSelected && (
                  <>
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                    )}
                  </>
                )}
                {isSubmitted && !isSelected && isCorrectOption && (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                )}
                <span>
                  {locale === "no" ? option.text_no : option.text_en}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {isSubmitted && (
        <div
          className={cn(
            "mt-4 p-4 rounded-lg",
            isCorrect
              ? "bg-green-50 dark:bg-green-950/20 border border-green-200"
              : "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200"
          )}
        >
          <div className="flex items-start gap-2">
            {isCorrect ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            )}
            <div>
              <p
                className={cn(
                  "font-medium",
                  isCorrect ? "text-green-700" : "text-yellow-700"
                )}
              >
                {isCorrect ? t("correct") : t("incorrect")}
              </p>
              <p className="text-sm mt-1 text-muted-foreground">
                {explanationText}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        {!isSubmitted ? (
          <Button onClick={handleSubmit} disabled={!selectedOption}>
            {t("submit")}
          </Button>
        ) : (
          <Button onClick={handleNext}>
            {isLastQuestion ? t("seeResults") : t("next")}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
