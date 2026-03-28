'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useFeatureFlag } from '@/lib/feature-flags';
import type { ConfluentSignal } from '@/lib/trading/confluent-signal-engine';
import type { ExplainSignalResult } from '@/lib/ai/sonar';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ConfluentSignalCardProps {
  signal: ConfluentSignal;
  symbol: string;
  timeframe?: 'short' | 'medium' | 'long';
  className?: string;
  showExplanationButton?: boolean;
}

interface SignalExplanationData {
  title: string;
  summary: string;
  key_points: string[];
  risk_warnings: string[];
  sources: { title: string; url: string }[];
}

// ============================================================================
// Helper functions
// ============================================================================

function getDecisionColor(decision: string): string {
  const upperDecision = decision.toUpperCase();
  if (upperDecision === 'STRONG_BUY' || upperDecision === 'BUY') {
    return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  }
  if (upperDecision === 'STRONG_SELL' || upperDecision === 'SELL') {
    return 'bg-red-500/15 text-red-400 border-red-500/30';
  }
  return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
}

function getDecisionLabel(decision: string): string {
  const labels: Record<string, string> = {
    STRONG_BUY: 'Sterkt kjøp',
    BUY: 'Kjøp',
    HOLD: 'Hold',
    SELL: 'Salg',
    STRONG_SELL: 'Sterkt salg',
  };
  return labels[decision.toUpperCase()] || decision;
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

function getRiskLevelLabel(level: number): string {
  const labels: Record<number, string> = {
    1: 'Lav',
    2: 'Lav-middels',
    3: 'Middels',
    4: 'Høy',
    5: 'Svært høy',
  };
  return labels[level] || 'Ukjent';
}

function getRegimeEmoji(regime: string): string {
  const emojis: Record<string, string> = {
    bull: '🐂',
    bear: '🐻',
    range: '↔️',
    unclear: '❓',
  };
  return emojis[regime] || '❓';
}

function getRegimeLabel(regime: string): string {
  const labels: Record<string, string> = {
    bull: 'Bull',
    bear: 'Bear',
    range: 'Sideways',
    unclear: 'Uklart',
  };
  return labels[regime] || regime;
}

// ============================================================================
// Components
// ============================================================================

export function ConfluentSignalCard({
  signal,
  symbol,
  timeframe = 'medium',
  className,
  showExplanationButton = true,
}: ConfluentSignalCardProps) {
  const sonarUiEnabled = useFeatureFlag('sonar-ui');
  const [explanationOpen, setExplanationOpen] = React.useState(false);
  const [explanationData, setExplanationData] =
    React.useState<SignalExplanationData | null>(null);
  const [explanationLoading, setExplanationLoading] = React.useState(false);
  const [explanationError, setExplanationError] = React.useState<string | null>(
    null
  );
  const [factorsExpanded, setFactorsExpanded] = React.useState(false);

  const decision =
    signal.score >= 80
      ? 'STRONG_BUY'
      : signal.score >= 60
        ? 'BUY'
        : signal.score >= 40
          ? 'HOLD'
          : signal.score >= 20
            ? 'SELL'
            : 'STRONG_SELL';

  const handleExplainSignal = async () => {
    if (!sonarUiEnabled) return;

    setExplanationOpen(true);
    setExplanationLoading(true);
    setExplanationError(null);

    try {
      const response = await fetch('/api/signal/explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          timeframe,
          decision,
          score: signal.score,
          risk_level: signal.riskLevel,
          factors: {
            trend: signal.factors.trend,
            volatility: signal.factors.volatility,
            ai_signal: signal.factors.ai_signal,
            ...(signal.factors.narrative_sentiment !== undefined && {
              narrative_sentiment: signal.factors.narrative_sentiment,
            }),
            ...(signal.factors.event_risk !== undefined && {
              event_risk: signal.factors.event_risk,
            }),
          },
          userRiskProfile: 'balanced',
          locale: 'nb-NO',
        }),
      });

      if (!response.ok) {
        throw new Error('Kunne ikke hente forklaring');
      }

      const data: SignalExplanationData = await response.json();
      setExplanationData(data);
    } catch (err) {
      setExplanationError(
        err instanceof Error ? err.message : 'En feil oppstod'
      );
    } finally {
      setExplanationLoading(false);
    }
  };

  const hasAiFactors =
    signal.factors.narrative_sentiment !== undefined ||
    signal.factors.market_regime !== undefined;

  return (
    <>
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <CardTitle className="text-lg font-bold">{symbol}</CardTitle>
                <CardDescription className="text-xs">
                  {timeframe === 'short'
                    ? 'Kortsiktig'
                    : timeframe === 'long'
                      ? 'Langsiktig'
                      : 'Middels'}{' '}
                  · Oppdatert nå
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'font-semibold capitalize',
                getDecisionColor(decision)
              )}
            >
              {decision.includes('BUY') ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : decision.includes('SELL') ? (
                <TrendingDown className="h-3 w-3 mr-1" />
              ) : (
                <Minus className="h-3 w-3 mr-1" />
              )}
              {getDecisionLabel(decision)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Score and Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Signalstyrke</span>
              <span
                className={cn(
                  'text-sm font-bold tabular-nums',
                  getScoreColor(signal.score)
                )}
              >
                {signal.score}/100
              </span>
            </div>
            <Progress value={signal.score} className="h-2" />
          </div>

          {/* AI Badge */}
          {sonarUiEnabled && hasAiFactors && (
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-purple-500/10 text-purple-400 border-purple-500/30"
              >
                <Brain className="h-3 w-3 mr-1" />
                AI-analysert
              </Badge>
              {signal.metadata?.usedFallback && (
                <Badge
                  variant="outline"
                  className="text-amber-400 border-amber-500/30"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Fallback
                </Badge>
              )}
            </div>
          )}

          {/* Key Factors */}
          <div className="space-y-2">
            <button
              onClick={() => setFactorsExpanded(!factorsExpanded)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="h-4 w-4" />
              <span>Nøkkelfaktorer</span>
              {factorsExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {factorsExpanded && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {/* Technical factors - always shown */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trend:</span>
                  <span
                    className={cn(
                      'font-medium',
                      signal.factors.trend > 0.6
                        ? 'text-emerald-400'
                        : signal.factors.trend < 0.4
                          ? 'text-red-400'
                          : 'text-amber-400'
                    )}
                  >
                    {(signal.factors.trend * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Volatilitet:</span>
                  <span className="font-medium">
                    {(signal.factors.volatility * 100).toFixed(0)}%
                  </span>
                </div>

                {/* AI factors - only shown when enabled */}
                {sonarUiEnabled && signal.factors.narrative_sentiment !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sentiment:</span>
                    <span
                      className={cn(
                        'font-medium',
                        signal.factors.narrative_sentiment > 0
                          ? 'text-emerald-400'
                          : signal.factors.narrative_sentiment < 0
                            ? 'text-red-400'
                            : 'text-slate-400'
                      )}
                    >
                      {signal.factors.narrative_sentiment > 0
                        ? '+'
                        : ''}
                      {signal.factors.narrative_sentiment}
                    </span>
                  </div>
                )}
                {sonarUiEnabled && signal.factors.event_risk !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hendelsesrisiko:</span>
                    <span
                      className={cn(
                        'font-medium',
                        signal.factors.event_risk > 0.7
                          ? 'text-red-400'
                          : signal.factors.event_risk > 0.4
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                      )}
                    >
                      {(signal.factors.event_risk * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
                {sonarUiEnabled && signal.factors.market_regime && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Markedsregime:</span>
                    <span className="font-medium">
                      {getRegimeEmoji(signal.factors.market_regime)}{' '}
                      {getRegimeLabel(signal.factors.market_regime)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between col-span-2 pt-2 border-t border-border/50">
                  <span className="text-muted-foreground">Risikonivå:</span>
                  <span
                    className={cn(
                      'font-medium',
                      signal.riskLevel >= 4
                        ? 'text-red-400'
                        : signal.riskLevel >= 3
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                    )}
                  >
                    {signal.riskLevel}/5 ({getRiskLevelLabel(signal.riskLevel)})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Explanation Button */}
          {showExplanationButton && sonarUiEnabled && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleExplainSignal}
            >
              <Brain className="h-4 w-4 mr-2" />
              Hvorfor dette signalet?
            </Button>
          )}

          {/* Reasoning text */}
          {signal.reason && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {signal.reason}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Explanation Dialog */}
      <Dialog open={explanationOpen} onOpenChange={setExplanationOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-400" />
              {explanationLoading
                ? 'Analyserer signal...'
                : explanationData?.title || 'Signalforklaring'}
            </DialogTitle>
            <DialogDescription>
              {symbol} · {getDecisionLabel(decision)} · {signal.score}/100
            </DialogDescription>
          </DialogHeader>

          {explanationLoading && (
            <div className="space-y-4 py-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}

          {explanationError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{explanationError}</AlertDescription>
            </Alert>
          )}

          {explanationData && !explanationLoading && (
            <div className="space-y-6 py-2">
              {/* Summary */}
              <div>
                <p className="text-sm leading-relaxed">
                  {explanationData.summary}
                </p>
              </div>

              {/* Key Points */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Viktige poeng</h4>
                <ul className="space-y-2">
                  {explanationData.key_points.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risk Warnings */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Risikoadvarsler
                </h4>
                <ul className="space-y-2">
                  {explanationData.risk_warnings.map((warning, index) => (
                    <li key={index} className="text-sm text-amber-200/80">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sources */}
              {explanationData.sources.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Kilder</h4>
                  <ul className="space-y-1">
                    {explanationData.sources.map((source, index) => (
                      <li key={index}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          {source.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// Skeleton Loader
// ============================================================================

export function ConfluentSignalCardSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}
