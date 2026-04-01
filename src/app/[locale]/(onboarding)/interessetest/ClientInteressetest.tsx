'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Progress } from '@/shared/ui/progress';
import { ArrowRight, ArrowLeft, CheckCircle, Sparkles, Target, Shield, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface Question {
  id: number;
  question: string;
  options: {
    text: string;
    scores: Record<string, number>;
  }[];
}

export default function ClientInteressetest() {
  const _t = useTranslations('interestTest');
  const locale = useLocale();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({
    beginner: 0,
    intermediate: 0,
    advanced: 0
  });
  const [showResult, setShowResult] = useState(false);

  const questions: Question[] = [
    {
      id: 1,
      question: locale === 'no' 
        ? 'Hvor mye vet du om krypto fra før?' 
        : 'How much do you know about crypto?',
      options: [
        { 
          text: locale === 'no' ? 'Ingenting, jeg er helt ny' : 'Nothing, I\'m completely new', 
          scores: { beginner: 3, intermediate: 0, advanced: 0 } 
        },
        { 
          text: locale === 'no' ? 'Litt, jeg har hørt om Bitcoin' : 'A little, I\'ve heard of Bitcoin', 
          scores: { beginner: 2, intermediate: 1, advanced: 0 } 
        },
        { 
          text: locale === 'no' ? 'En del, jeg har eid krypto før' : 'Quite a bit, I\'ve owned crypto before', 
          scores: { beginner: 0, intermediate: 2, advanced: 1 } 
        },
        { 
          text: locale === 'no' ? 'Mye, jeg trader aktivt' : 'A lot, I trade actively', 
          scores: { beginner: 0, intermediate: 1, advanced: 3 } 
        },
      ]
    },
    {
      id: 2,
      question: locale === 'no'
        ? 'Hva er målet ditt med krypto?'
        : 'What is your goal with crypto?',
      options: [
        { 
          text: locale === 'no' ? 'Lære det grunnleggende' : 'Learn the basics', 
          scores: { beginner: 3, intermediate: 0, advanced: 0 } 
        },
        { 
          text: locale === 'no' ? 'Sikre meg mot inflasjon' : 'Protect against inflation', 
          scores: { beginner: 2, intermediate: 2, advanced: 0 } 
        },
        { 
          text: locale === 'no' ? 'Tjene penger på trading' : 'Make money from trading', 
          scores: { beginner: 0, intermediate: 2, advanced: 2 } 
        },
        { 
          text: locale === 'no' ? 'Bygge avanserte strategier' : 'Build advanced strategies', 
          scores: { beginner: 0, intermediate: 0, advanced: 3 } 
        },
      ]
    },
    {
      id: 3,
      question: locale === 'no'
        ? 'Hvor mye tid vil du bruke på læring?'
        : 'How much time do you want to spend learning?',
      options: [
        { 
          text: locale === 'no' ? '1-2 timer i uken' : '1-2 hours per week', 
          scores: { beginner: 2, intermediate: 1, advanced: 0 } 
        },
        { 
          text: locale === 'no' ? '3-5 timer i uken' : '3-5 hours per week', 
          scores: { beginner: 1, intermediate: 3, advanced: 1 } 
        },
        { 
          text: locale === 'no' ? '5-10 timer i uken' : '5-10 hours per week', 
          scores: { beginner: 0, intermediate: 2, advanced: 3 } 
        },
        { 
          text: locale === 'no' ? 'Så mye som trengs' : 'As much as needed', 
          scores: { beginner: 0, intermediate: 1, advanced: 3 } 
        },
      ]
    },
    {
      id: 4,
      question: locale === 'no'
        ? 'Hvordan føler du deg om risiko?'
        : 'How do you feel about risk?',
      options: [
        { 
          text: locale === 'no' ? 'Jeg vil være helt trygg' : 'I want to be completely safe', 
          scores: { beginner: 3, intermediate: 0, advanced: 0 } 
        },
        { 
          text: locale === 'no' ? 'Litt risiko er OK' : 'Some risk is OK', 
          scores: { beginner: 1, intermediate: 3, advanced: 1 } 
        },
        { 
          text: locale === 'no' ? 'Jeg tåler store svingninger' : 'I can handle big swings', 
          scores: { beginner: 0, intermediate: 1, advanced: 3 } 
        },
        { 
          text: locale === 'no' ? 'Høy risiko = høy belønning' : 'High risk = high reward', 
          scores: { beginner: 0, intermediate: 0, advanced: 3 } 
        },
      ]
    },
    {
      id: 5,
      question: locale === 'no'
        ? 'Har du brukt trading-plattformer før?'
        : 'Have you used trading platforms before?',
      options: [
        { 
          text: locale === 'no' ? 'Aldri' : 'Never', 
          scores: { beginner: 3, intermediate: 0, advanced: 0 } 
        },
        { 
          text: locale === 'no' ? 'Kun nettbank/aksjer' : 'Only online banking/stocks', 
          scores: { beginner: 1, intermediate: 2, advanced: 0 } 
        },
        { 
          text: locale === 'no' ? 'Ja, noen få ganger' : 'Yes, a few times', 
          scores: { beginner: 0, intermediate: 3, advanced: 1 } 
        },
        { 
          text: locale === 'no' ? 'Ja, jeg er erfaren' : 'Yes, I\'m experienced', 
          scores: { beginner: 0, intermediate: 1, advanced: 3 } 
        },
      ]
    }
  ];

  const handleAnswer = (scoresForAnswer: Record<string, number>) => {
    const newScores = { ...scores };
    Object.entries(scoresForAnswer).forEach(([key, value]) => {
      newScores[key] += value;
    });
    setScores(newScores);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResult(true);
    }
  };

  const getRecommendation = () => {
    const maxScore = Math.max(scores.beginner, scores.intermediate, scores.advanced);
    if (maxScore === scores.advanced) return 'advanced';
    if (maxScore === scores.intermediate) return 'intermediate';
    return 'beginner';
  };

  const getCourseSlug = (level: string) => {
    if (level === 'advanced') return 'trading-masterclass';
    if (level === 'intermediate') return 'defi-explorer';
    return 'krypto-for-smaasparere';
  };

  const recommendation = getRecommendation();
  const courseSlug = getCourseSlug(recommendation);

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  if (showResult) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <CardTitle className="text-white text-2xl">
                {locale === 'no' ? 'Vi har funnet det perfekte kurset for deg!' : 'We found the perfect course for you!'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {recommendation === 'beginner' && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-8 h-8 text-blue-400" />
                    <h3 className="text-xl font-bold text-white">
                      {locale === 'no' ? 'Krypto for Småsparere' : 'Crypto for Small Savers'}
                    </h3>
                  </div>
                  <p className="text-slate-300 mb-4">
                    {locale === 'no' 
                      ? 'Dette er det perfekte kurset for deg som er helt ny i krypto. Du lærer alt fra A til Å på en trygg måte.'
                      : 'This is the perfect course for complete beginners. You\'ll learn everything from A to Z in a safe way.'}
                  </p>
                  <ul className="space-y-2 text-slate-400 text-sm mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      {locale === 'no' ? 'Grunnleggende om Bitcoin og Ethereum' : 'Basics of Bitcoin and Ethereum'}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      {locale === 'no' ? 'Hvordan kjøpe og oppbevare krypto trygt' : 'How to buy and store crypto safely'}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      {locale === 'no' ? '4 uker, 8 timer totalt' : '4 weeks, 8 hours total'}
                    </li>
                  </ul>
                </div>
              )}

              {recommendation === 'intermediate' && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Target className="w-8 h-8 text-emerald-400" />
                    <h3 className="text-xl font-bold text-white">
                      {locale === 'no' ? 'DeFi Explorer' : 'DeFi Explorer'}
                    </h3>
                  </div>
                  <p className="text-slate-300 mb-4">
                    {locale === 'no'
                      ? 'Du har litt erfaring, men vil lære mer om avanserte temaer som DeFi og passiv inntekt.'
                      : 'You have some experience, but want to learn more about advanced topics like DeFi and passive income.'}
                  </p>
                  <ul className="space-y-2 text-slate-400 text-sm mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      {locale === 'no' ? 'DeFi og smarte kontrakter' : 'DeFi and smart contracts'}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      {locale === 'no' ? 'Staking og yield farming' : 'Staking and yield farming'}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      {locale === 'no' ? '6 uker, 12 timer totalt' : '6 weeks, 12 hours total'}
                    </li>
                  </ul>
                </div>
              )}

              {recommendation === 'advanced' && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingUp className="w-8 h-8 text-amber-400" />
                    <h3 className="text-xl font-bold text-white">
                      {locale === 'no' ? 'Trading Masterclass' : 'Trading Masterclass'}
                    </h3>
                  </div>
                  <p className="text-slate-300 mb-4">
                    {locale === 'no'
                      ? 'Du er klar for avanserte trading-strategier og teknisk analyse. Dette er for deg som vil ta det til neste nivå.'
                      : 'You\'re ready for advanced trading strategies and technical analysis. This is for those who want to take it to the next level.'}
                  </p>
                  <ul className="space-y-2 text-slate-400 text-sm mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      {locale === 'no' ? 'Teknisk analyse og diagramlesing' : 'Technical analysis and chart reading'}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      {locale === 'no' ? 'Risikostyring og strategi' : 'Risk management and strategy'}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      {locale === 'no' ? '8 uker, 16 timer totalt' : '8 weeks, 16 hours total'}
                    </li>
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  asChild
                >
                  <Link href={`/${locale}/kurs/${courseSlug}`}>
                    {locale === 'no' ? 'Se kursdetaljer' : 'See course details'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                  asChild
                >
                  <Link href={`/${locale}/kurs`}>
                    {locale === 'no' ? 'Se alle kurs' : 'See all courses'}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {locale === 'no' ? 'Finn ditt perfekte kurs' : 'Find your perfect course'}
          </h1>
          <p className="text-slate-400 text-lg">
            {locale === 'no' 
              ? 'Svar på 5 spørsmål så finner vi kurset som passer deg best'
              : 'Answer 5 questions and we\'ll find the course that suits you best'}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>{locale === 'no' ? 'Spørsmål' : 'Question'} {currentQuestion + 1} {locale === 'no' ? 'av' : 'of'} {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white text-xl">
              {questions[currentQuestion].question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option.scores)}
                className="w-full p-4 text-left rounded-xl border border-slate-700 bg-slate-900/50 hover:bg-slate-800 hover:border-blue-500/50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 group-hover:text-white">{option.text}</span>
                  <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Back button */}
        {currentQuestion > 0 && (
          <button
            onClick={() => setCurrentQuestion(currentQuestion - 1)}
            className="mt-4 text-slate-400 hover:text-white flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            {locale === 'no' ? 'Forrige spørsmål' : 'Previous question'}
          </button>
        )}
      </div>
    </div>
  );
}
