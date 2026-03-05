'use client';

import { useState } from 'react';
import { Play, Trophy, Target, BookOpen, TrendingUp, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { TradingChart } from '@/components/trading-chart';
import { ToolContextBanner } from '@/components/learning/LearningBanner';

type Scenario = {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  symbol: string;
  learning: string;
};

const colors = {
  easy: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  hard: 'bg-red-100 text-red-700 border-red-200',
};

export default function ClientSimulator() {
  const locale = useLocale();
  const t = useTranslations('simulator');
  const _tg = useTranslations('gamification');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [showExplanation, setShowExplanation] = useState(true);

  // Get scenarios from translations
  const scenarios: Scenario[] = [
    { 
      id: '1', 
      title: t('scenarios.list.0.title'), 
      description: t('scenarios.list.0.description'),
      difficulty: 'easy', 
      symbol: 'BTC',
      learning: t('scenarios.list.0.learning')
    },
    { 
      id: '2', 
      title: t('scenarios.list.1.title'), 
      description: t('scenarios.list.1.description'),
      difficulty: 'easy', 
      symbol: 'ETH',
      learning: t('scenarios.list.1.learning')
    },
    { 
      id: '3', 
      title: t('scenarios.list.2.title'), 
      description: t('scenarios.list.2.description'),
      difficulty: 'medium', 
      symbol: 'BTC',
      learning: t('scenarios.list.2.learning')
    },
    { 
      id: '4', 
      title: t('scenarios.list.3.title'), 
      description: t('scenarios.list.3.description'),
      difficulty: 'medium', 
      symbol: 'SOL',
      learning: t('scenarios.list.3.learning')
    },
    { 
      id: '5', 
      title: t('scenarios.list.4.title'), 
      description: t('scenarios.list.4.description'),
      difficulty: 'hard', 
      symbol: 'BTC',
      learning: t('scenarios.list.4.learning')
    },
  ];

  const totalScenarios = scenarios.length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Learning Context Banner */}
        <ToolContextBanner
          toolName="Trading Simulator"
          toolContext="simulator"
          taskDescription={locale === 'no' 
            ? "Utforsk grafen og klikk på ulike punkter for å forstå prisbevegelsene. Velg et scenario for å øve på spesifikke situasjoner."
            : "Explore the chart and click on various points to understand price movements. Select a scenario to practice specific situations."
          }
        />

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#0A0B0D] mb-2">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <Trophy className="w-5 h-5 text-[#0052FF] mb-2" />
            <p className="text-2xl font-bold">0 / {totalScenarios}</p>
            <p className="text-sm text-gray-500">{t('stats.completed')}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <Target className="w-5 h-5 text-green-600 mb-2" />
            <p className="text-2xl font-bold">0%</p>
            <p className="text-sm text-gray-500">{t('stats.accuracy')}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <BookOpen className="w-5 h-5 text-emerald-600 mb-2" />
            <p className="text-2xl font-bold">{totalScenarios}</p>
            <p className="text-sm text-gray-500">{t('stats.lessonsAvailable')}</p>
          </div>
        </div>

        {/* Pedagogisk info */}
        {showExplanation && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Lightbulb className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">{t('howTo.title')}</h3>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• {t('howTo.steps.0')}</li>
                    <li>• {t('howTo.steps.1')}</li>
                    <li>• {t('howTo.steps.2')}</li>
                    <li>• {t('howTo.steps.3')}</li>
                  </ul>
                  <button 
                    onClick={() => setShowExplanation(false)}
                    className="text-blue-700 underline text-sm mt-2"
                  >
                    {t('howTo.hide')}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#0052FF]" />
                {selectedScenario?.symbol || 'BTC'} - {t('chart.title')}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {selectedScenario 
                  ? `${locale === 'no' ? 'Scenario' : 'Scenario'}: ${selectedScenario.title} – ${selectedScenario.learning}`
                  : t('chart.selectScenario')
                }
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/${locale}/paper-trading`}>
                {t('buttons.openPaperTrading')}
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <TradingChart symbol={selectedScenario?.symbol || 'BTC'} />
          </CardContent>
        </Card>

        {/* Scenarios */}
        <Card>
          <CardHeader>
            <CardTitle>{t('scenarios.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  onClick={() => setSelectedScenario(scenario)}
                  className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${
                    selectedScenario?.id === scenario.id 
                      ? 'bg-blue-50 border-2 border-[#0052FF]' 
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center text-white font-bold">
                      {scenario.id}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{scenario.title}</p>
                      <p className="text-sm text-gray-500">{scenario.description}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        {locale === 'no' ? 'Du lærer:' : 'You learn:'} {scenario.learning}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[scenario.difficulty]}`}>
                      {t(`scenarios.difficulty.${scenario.difficulty}`)}
                    </span>
                    <Button size="sm" variant={selectedScenario?.id === scenario.id ? "default" : "outline"}>
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            {t('ready')}
          </p>
          <Button asChild size="lg">
            <Link href={`/${locale}/paper-trading`}>
              {t('buttons.startPaperTrading')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
