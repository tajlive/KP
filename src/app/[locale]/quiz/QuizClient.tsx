"use client";

import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  RotateCcw,
  TrendingUp,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

export function QuizClient() {
  const t = useTranslations("quizPage");
  const locale = useLocale();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const questions = [
    {
      question: t("questions.0.question"),
      options: [
        t("questions.0.options.0"),
        t("questions.0.options.1"),
        t("questions.0.options.2"),
        t("questions.0.options.3"),
      ],
      correct: 0,
      explanation: t("questions.0.explanation"),
    },
    {
      question: t("questions.1.question"),
      options: [
        t("questions.1.options.0"),
        t("questions.1.options.1"),
        t("questions.1.options.2"),
        t("questions.1.options.3"),
      ],
      correct: 1,
      explanation: t("questions.1.explanation"),
    },
    {
      question: t("questions.2.question"),
      options: [
        t("questions.2.options.0"),
        t("questions.2.options.1"),
        t("questions.2.options.2"),
        t("questions.2.options.3"),
      ],
      correct: 1,
      explanation: t("questions.2.explanation"),
    },
  ];

  const handleAnswer = (index: number) => {
    setSelectedAnswer(index);
    setShowResult(true);
    if (index === questions[currentQuestion].correct) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setCompleted(true);
    }
  };

  const handleReset = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setCompleted(false);
  };

  if (completed) {
    const percentage = (score / questions.length) * 100;
    const passed = percentage >= 70;

    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <div
              className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
                passed ? "bg-green-100" : "bg-red-100"
              }`}
            >
              {passed ? (
                <Check className="w-10 h-10 text-green-600" />
              ) : (
                <X className="w-10 h-10 text-red-600" />
              )}
            </div>

            <h1 className="text-3xl font-bold text-[#0A0B0D] mb-2">
              {passed ? t("result.congratulations") : t("result.tryAgain")}
            </h1>
            <p className="text-gray-600 mb-6">
              {passed ? t("result.passedMessage") : t("result.failedMessage")}
            </p>

            <div className="text-5xl font-bold text-[#0052FF] mb-8">
              {score} / {questions.length}
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-500 mb-1">
                  {t("result.score")}
                </div>
                <div className="text-2xl font-bold text-[#0A0B0D]">
                  {percentage.toFixed(0)}%
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-500 mb-1">
                  {t("result.status")}
                </div>
                <div
                  className={`text-2xl font-bold ${passed ? "text-green-600" : "text-red-600"}`}
                >
                  {passed ? t("result.passed") : t("result.failed")}
                </div>
              </div>
            </div>

            {/* Neste steg */}
            <div className="border-t pt-6 mb-6">
              <p className="text-sm text-gray-500 mb-4">
                {t("result.whatNow")}
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Link
                  href={`/${locale}/paper-trading`}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0052FF] text-white font-medium rounded-xl hover:bg-[#0047E0] transition-colors"
                >
                  <TrendingUp className="w-4 h-4" />
                  {t("result.tryPaperTrading")}
                </Link>
                <Link
                  href={`/${locale}/kurs`}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  {t("result.continueLearning")}
                </Link>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {t("result.retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Intro */}
        <div className="bg-blue-50 rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-2">
            {t("testKnowledge")}
          </h2>
          <p className="text-gray-600 text-sm">{t("description")}</p>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#0052FF] rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#0A0B0D]">
                {t("title")}
              </h2>
              <p className="text-gray-600">{t("subtitle")}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>
                {t("questionProgress", {
                  current: currentQuestion + 1,
                  total: questions.length,
                })}
              </span>
              <span>{t("correctCount", { score })}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-[#0052FF] rounded-full h-2 transition-all duration-300"
                style={{
                  width: `${((currentQuestion + 1) / questions.length) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-[#0A0B0D] mb-6">
            {question.question}
          </h2>

          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => !showResult && handleAnswer(index)}
                disabled={showResult}
                className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                  !showResult
                    ? "border-gray-200 hover:border-[#0052FF] hover:bg-blue-50"
                    : selectedAnswer === index
                      ? index === question.correct
                        ? "border-green-600 bg-green-50"
                        : "border-red-600 bg-red-50"
                      : index === question.correct
                        ? "border-green-600 bg-green-50"
                        : "border-gray-200 opacity-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#0A0B0D]">{option}</span>
                  {showResult && index === question.correct && (
                    <Check className="w-5 h-5 text-green-600" />
                  )}
                  {showResult &&
                    selectedAnswer === index &&
                    index !== question.correct && (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                </div>
              </button>
            ))}
          </div>

          {showResult && (
            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <div className="font-medium text-[#0052FF] mb-2">
                {selectedAnswer === question.correct
                  ? t("result.correct")
                  : t("result.wrong")}
              </div>
              <p className="text-sm text-gray-700">{question.explanation}</p>
            </div>
          )}

          {showResult && (
            <button
              onClick={handleNext}
              className="w-full mt-6 py-4 bg-[#0052FF] text-white font-semibold rounded-full hover:bg-[#0047E0] transition-colors flex items-center justify-center gap-2"
            >
              {currentQuestion < questions.length - 1
                ? t("nextQuestion")
                : t("seeResult")}
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
