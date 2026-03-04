'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CheckCircle2, XCircle, Lightbulb, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MiniQuizProps {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  lessonId?: string;
  onComplete?: (isCorrect: boolean) => void;
  className?: string;
}

export function MiniQuiz({
  question,
  options,
  correctIndex,
  explanation,
  lessonId,
  onComplete,
  className,
}: MiniQuizProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleSelect = (index: number) => {
    if (isSubmitted) return;
    setSelectedIndex(index);
  };

  const handleSubmit = () => {
    if (selectedIndex === null) return;
    
    const correct = selectedIndex === correctIndex;
    setIsCorrect(correct);
    setIsSubmitted(true);
    onComplete?.(correct);
  };

  const handleReset = () => {
    setSelectedIndex(null);
    setIsSubmitted(false);
    setIsCorrect(false);
  };

  return (
    <Card className={cn('border-l-4 border-l-blue-500', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-blue-600">
          <Lightbulb className="w-5 h-5" />
          <span className="text-sm font-medium">Hva tror du?</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-lg font-medium text-gray-900">{question}</p>
        
        {/* Alternativer */}
        <div className="space-y-2">
          {options.map((option, index) => {
            const isSelected = selectedIndex === index;
            const isCorrectOption = index === correctIndex;
            const showCorrect = isSubmitted && isCorrectOption;
            const showWrong = isSubmitted && isSelected && !isCorrect;
            
            return (
              <button
                key={index}
                onClick={() => handleSelect(index)}
                disabled={isSubmitted}
                className={cn(
                  'w-full text-left p-4 rounded-lg border-2 transition-all',
                  'hover:border-blue-300',
                  isSelected && !isSubmitted && 'border-blue-500 bg-blue-50',
                  showCorrect && 'border-green-500 bg-green-50',
                  showWrong && 'border-red-500 bg-red-50',
                  !isSelected && !isSubmitted && 'border-gray-200 bg-white'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'text-gray-700',
                    showCorrect && 'text-green-700 font-medium',
                    showWrong && 'text-red-700'
                  )}>
                    {option}
                  </span>
                  {showCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {showWrong && <XCircle className="w-5 h-5 text-red-500" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Submit-knapp */}
        {!isSubmitted && (
          <Button
            onClick={handleSubmit}
            disabled={selectedIndex === null}
            className="w-full"
          >
            Sjekk svar
          </Button>
        )}

        {/* Resultat */}
        {isSubmitted && (
          <div className={cn(
            'p-4 rounded-lg',
            isCorrect ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
          )}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-700">Riktig! 🎉</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold text-orange-700">Ikke helt...</span>
                </>
              )}
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">{explanation}</p>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="mt-4"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Prøv igjen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Forhåndsdefinerte quizer for gjenbruk
export const COMMON_QUIZZES = {
  risiko: {
    question: 'Hva er den største risikoen med å investere i krypto?',
    options: [
      'At du kan tape alle pengene du investerer',
      'At nettet går ned',
      'At det tar lang tid å kjøpe',
      'At du må betale skatt',
    ],
    correctIndex: 0,
    explanation: 'Kryptomarkedet er svært volatilt. Du kan teoretisk sett tape hele investeringen. Derfor er den viktigste regelen: Aldri invester mer enn du tåler å tape.',
  },
  stoploss: {
    question: 'Hva gjør en stop-loss?',
    options: [
      'Den garanterer at du aldri taper penger',
      'Den selger automatisk hvis prisen faller under et nivå du har satt',
      'Den kjøper mer når prisen går ned',
      'Den sender deg en e-post hver dag',
    ],
    correctIndex: 1,
    explanation: 'En stop-loss er en automatisk ordre som selger posisjonen din hvis prisen faller til et bestemt nivå. Den beskytter deg mot store tap, men ikke mot alt (f.eks. gap ned).',
  },
  diversifisering: {
    question: 'Hvorfor er det lurt å spre investeringene på flere kryptovaluta?',
    options: [
      'For å tjene mer på hver enkelt',
      'For å redusere risiko hvis én går dårlig',
      'For å unngå skatt',
      'Det er ikke lurt å spre',
    ],
    correctIndex: 1,
    explanation: 'Å ikke ha alle egg i én kurv er en grunnleggende investeringsregel. Hvis du sprer på flere kryptovaluta, vil ikke ett prosjekts fiasko ødelegge hele porteføljen din.',
  },
  fomo: {
    question: 'Hva betegner FOMO i trading?',
    options: [
      'Fear Of Missing Out – frykten for å gå glipp av noe',
      'Fast Online Money Option',
      'First Order Must Open',
      'Financial Opportunity Management Office',
    ],
    correctIndex: 0,
    explanation: 'FOMO (Fear Of Missing Out) er når du kjøper noe bare fordi prisen går opp og du er redd for å gå glipp av gevinster. Dette er en vanlig felle som fører til kjøp på toppen.',
  },
  hodl: {
    question: 'Hva betyr uttrykket "HODL" i kryptomiljøet?',
    options: [
      'Hold On for Dear Life – å holde på investeringen selv når det går dårlig',
      'High Order Daily Limit',
      'Akjøpe nye krypto hver dag',
      'Å selge alt med en gang',
    ],
    correctIndex: 0,
    explanation: 'HODL stammer fra en stavefeil i et foruminnlegg. Det betyr å holde på kryptoen sin gjennom oppganger og nedturer, i stedet for å prøve å time markedet.',
  },
};

// Enkel komponent for å vise en av de vanlige quizzene
export function CommonMiniQuiz({ 
  quizKey, 
  ...props 
}: { 
  quizKey: keyof typeof COMMON_QUIZZES 
} & Omit<MiniQuizProps, 'question' | 'options' | 'correctIndex' | 'explanation'>) {
  const quiz = COMMON_QUIZZES[quizKey];
  return <MiniQuiz {...quiz} {...props} />;
}
