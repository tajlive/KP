'use client';

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * LEARNING DASHBOARD COMPONENT
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Displays trading analysis and personalized learning:
 * - Trading score with progress bar
 * - Identified mistakes with severity
 * - Personalized learning plan
 * - Educational content links
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Target,
  AlertCircle,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';

interface TradingMistake {
  type: string;
  title: string;
  description: string;
  frequency: number;
  impact: number;
  lesson: string;
  lessonUrl: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface LearningLesson {
  title: string;
  url: string;
  priority: number;
  estimatedTime: number;
}

interface LearningPlan {
  lessons: LearningLesson[];
  totalEstimatedTime: number;
  focusAreas: string[];
}

interface AnalysisSummary {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnl: number;
  mistakesCost: number;
  potentialSavings: number;
}

interface AnalysisData {
  success: boolean;
  sessionId: string;
  mistakes: TradingMistake[];
  learningPlan: LearningPlan;
  tradingScore: number;
  summary: AnalysisSummary;
  timestamp: string;
}

interface Props {
  sessionId: string;
}

export function LearningDashboard({ sessionId }: Props) {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchAnalysis = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/auto-trading/mistakes?sessionId=${sessionId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch analysis');
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast({
        title: 'Feil',
        description: 'Kunne ikke laste analyse',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionId, toast]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Lightbulb className="h-4 w-4 text-blue-600" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 80) return 'Utmerket! Du trader disiplinert.';
    if (score >= 60) return 'Bra! Noen områder å forbedre.';
    if (score >= 40) return 'OK, men mye å lære.';
    return 'Kritisk! Fokuser på grunnleggende.';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900';
    if (score >= 40) return 'bg-orange-100 dark:bg-orange-900';
    return 'bg-red-100 dark:bg-red-900';
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  const { mistakes, learningPlan, tradingScore, summary } = data;
  const hasMistakes = mistakes.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Din Læringsanalyse
        </h2>
        <Button variant="ghost" size="icon" onClick={fetchAnalysis} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Trading Score */}
      <Card className={getScoreBgColor(tradingScore)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className={`text-6xl font-bold ${getScoreColor(tradingScore)}`}>
              {tradingScore}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Din Trading Score</span>
              </div>
              <Progress value={tradingScore} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                {getScoreMessage(tradingScore)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Oppsummering
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryItem label="Totalt trades" value={summary.totalTrades} />
            <SummaryItem 
              label="Win rate" 
              value={`${summary.totalTrades > 0 
                ? ((summary.winningTrades / summary.totalTrades) * 100).toFixed(1) 
                : 0}%`} 
            />
            <SummaryItem 
              label="Total P&L" 
              value={`${summary.totalPnl >= 0 ? '+' : ''}${summary.totalPnl.toFixed(0)} kr`}
              valueColor={summary.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}
            />
            <SummaryItem 
              label="Potensiell besparelse" 
              value={`${summary.potentialSavings.toFixed(0)} kr`}
              valueColor="text-blue-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Mistakes Overview */}
      {hasMistakes ? (
        <>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Vi har identifisert {mistakes.length} forbedringsområder i din trading.
              Total kostnad: <strong>{mistakes.reduce((sum, m) => sum + m.impact, 0).toFixed(0)} kr</strong>.
            </AlertDescription>
          </Alert>

          {/* Individual Mistakes */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Identifiserte Feil
            </h3>
            
            {mistakes.map((mistake) => (
              <Card key={mistake.type} className="border-l-4 border-l-red-500">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(mistake.severity)}
                      <h4 className="font-semibold text-lg">{mistake.title}</h4>
                      <Badge className={getSeverityColor(mistake.severity)}>
                        {mistake.severity}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {mistake.description}
                  </p>

                  <div className="flex gap-6 text-sm mb-4">
                    <span>
                      <strong>Frekvens:</strong> {mistake.frequency}x
                    </span>
                    <span className="text-red-600">
                      <strong>Kostnad:</strong> -{mistake.impact.toFixed(0)} kr
                    </span>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Leksjon
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {mistake.lesson}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button size="sm" className="mt-3" asChild>
                    <a href={mistake.lessonUrl}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Lær mer
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card className="p-8 text-center border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Bra jobbet!</h3>
          <p className="text-muted-foreground">
            Vi fant ingen kritiske feil i din trading. Fortsett slik!
          </p>
        </Card>
      )}

      {/* Learning Plan */}
      {learningPlan.lessons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Din Personlige Læringsplan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Estimert tid: {learningPlan.totalEstimatedTime} minutter
              </span>
              
              {learningPlan.focusAreas.length > 0 && (
                <>
                  <span>•</span>
                  <span>Fokusområder: {learningPlan.focusAreas.join(', ')}</span>
                </>
              )}
            </div>

            <ol className="space-y-3">
              {learningPlan.lessons.map((lesson, index) => (
                <li 
                  key={index} 
                  className="flex items-start gap-3 p-4 bg-accent rounded-lg hover:bg-accent/80 transition-colors"
                >
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    {lesson.priority}
                  </span>
                  <div className="flex-1">
                    <a 
                      href={lesson.url} 
                      className="font-medium hover:underline text-blue-600 dark:text-blue-400"
                    >
                      {lesson.title}
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">
                      {lesson.estimatedTime} minutter
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <Button className="w-full" size="lg">
              <BookOpen className="h-5 w-5 mr-2" />
              Start Læring
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Summary Item Component
function SummaryItem({ 
  label, 
  value, 
  valueColor = 'text-foreground' 
}: { 
  label: string; 
  value: string | number;
  valueColor?: string;
}) {
  return (
    <div className="text-center p-3 bg-accent rounded-lg">
      <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
