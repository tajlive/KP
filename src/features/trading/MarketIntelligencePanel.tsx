"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  ShieldCheck,
  Newspaper,
  Brain,
  Info,
  RefreshCw,
  AlertCircle,
  Ban,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { useTranslations } from "next-intl";

// ============================================================================
// Types
// ============================================================================

type MarketRegime = 'BULL' | 'BEAR' | 'SIDEWAYS' | 'UNCERTAIN';
type SentimentType = 'bullish' | 'bearish' | 'neutral';
type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

interface RegimeData {
  type: MarketRegime;
  confidence: ConfidenceLevel;
  reasoning: string;
  indicators: {
    ema?: { trend: string; ema21: number; ema55: number; ema200: number } | null;
    adx?: { adx: number; trendStrength: string; trendDirection: string } | null;
    rsi?: { value: number; condition: string } | null;
  };
}

interface SentimentData {
  type: SentimentType;
  confidence: number;
  recommendation: 'buy' | 'hold' | 'avoid';
  keyEvents: string[];
  newsCount?: number;
  sources?: { title: string; url: string }[];
}

interface ActiveStrategy {
  positionSizeMul: number;
  maxOpenPositions: number;
  approach: string;
  description: string;
  isBlockingBuys: boolean;
}

interface MarketIntelligenceData {
  regime: RegimeData;
  sentiment: SentimentData;
  activeStrategy: ActiveStrategy;
  updatedAt: string;
}

interface MarketIntelligencePanelProps {
  symbol: string;
  className?: string;
  refreshInterval?: number; // milliseconds
}

// ============================================================================
// Helper Functions
// ============================================================================

function regimeToEmoji(regime: MarketRegime): string {
  const emoji: Record<MarketRegime, string> = {
    BULL: '🟢',
    BEAR: '🔴',
    SIDEWAYS: '🟡',
    UNCERTAIN: '⚪',
  };
  return emoji[regime];
}

function regimeToLabel(regime: MarketRegime): string {
  const labels: Record<MarketRegime, string> = {
    BULL: 'Bull Market',
    BEAR: 'Bear Market',
    SIDEWAYS: 'Sideways',
    UNCERTAIN: 'Usikkert',
  };
  return labels[regime];
}

function regimeToColor(regime: MarketRegime): string {
  const colors: Record<MarketRegime, string> = {
    BULL: 'text-green-600 dark:text-green-400',
    BEAR: 'text-red-600 dark:text-red-400',
    SIDEWAYS: 'text-yellow-600 dark:text-yellow-400',
    UNCERTAIN: 'text-gray-500 dark:text-gray-400',
  };
  return colors[regime];
}

function regimeToBgColor(regime: MarketRegime): string {
  const colors: Record<MarketRegime, string> = {
    BULL: 'bg-green-100 dark:bg-green-950/50 border-green-300 dark:border-green-800',
    BEAR: 'bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-800',
    SIDEWAYS: 'bg-yellow-100 dark:bg-yellow-950/50 border-yellow-300 dark:border-yellow-800',
    UNCERTAIN: 'bg-gray-100 dark:bg-gray-950/50 border-gray-300 dark:border-gray-800',
  };
  return colors[regime];
}

function sentimentToEmoji(sentiment: SentimentType): string {
  const emoji: Record<SentimentType, string> = {
    bullish: '🟢',
    bearish: '🔴',
    neutral: '🟡',
  };
  return emoji[sentiment];
}

function sentimentToLabel(sentiment: SentimentType): string {
  const labels: Record<SentimentType, string> = {
    bullish: 'Positivt',
    bearish: 'Negativt',
    neutral: 'Nøytralt',
  };
  return labels[sentiment];
}

function sentimentToColor(sentiment: SentimentType): string {
  const colors: Record<SentimentType, string> = {
    bullish: 'text-green-600 dark:text-green-400',
    bearish: 'text-red-600 dark:text-red-400',
    neutral: 'text-amber-600 dark:text-amber-400',
  };
  return colors[sentiment];
}

function sentimentToBgColor(sentiment: SentimentType): string {
  const colors: Record<SentimentType, string> = {
    bullish: 'bg-green-100 dark:bg-green-950/50 border-green-300 dark:border-green-800',
    bearish: 'bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-800',
    neutral: 'bg-amber-100 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800',
  };
  return colors[sentiment];
}

function confidenceToLabel(confidence: ConfidenceLevel): string {
  const labels: Record<ConfidenceLevel, string> = {
    HIGH: 'Høy',
    MEDIUM: 'Middels',
    LOW: 'Lav',
  };
  return labels[confidence];
}

// ============================================================================
// Component
// ============================================================================

export function MarketIntelligencePanel({
  symbol,
  className,
  refreshInterval = 300000, // 5 minutes default
}: MarketIntelligencePanelProps) {
  const t = useTranslations("trading");
  const [data, setData] = useState<MarketIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/market-intelligence?symbol=${symbol}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [symbol, refreshInterval]);

  // Loading state
  if (loading && !data) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{t("marketIntelligence")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-20 bg-muted rounded-lg" />
          <div className="h-20 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <Card className={cn("border-red-300", className)}>
        <CardHeader>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <CardTitle className="text-lg">{t("marketIntelligence")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{t("marketDataLoadError")}</p>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Prøv igjen
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { regime, sentiment, activeStrategy, updatedAt } = data;
  const isBlocking = activeStrategy.isBlockingBuys;

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-[#0052FF]" />
            <CardTitle className="text-lg">{t("marketIntelligence")}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {symbol}
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={fetchData}
                    disabled={loading}
                  >
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Sist oppdatert: {lastUpdated.toLocaleTimeString('no-NO')}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Blocking Alert */}
        {isBlocking && (
          <div className="p-3 bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Ban className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">
                  Ingen nye kjøp aktivert
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {activeStrategy.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Regime Panel */}
          <div className={cn(
            "p-4 rounded-lg border",
            regimeToBgColor(regime.type)
          )}>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">{t("marketRegime")}</span>
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{regimeToEmoji(regime.type)}</span>
              <div>
                <p className={cn("font-semibold", regimeToColor(regime.type))}>
                  {regimeToLabel(regime.type)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {confidenceToLabel(regime.confidence)} konfidens
                </p>
              </div>
            </div>

            {/* Indicators */}
            {regime.indicators.ema && (
              <div className="mt-3 pt-3 border-t border-current/20">
                <p className="text-xs text-muted-foreground mb-2">Indikatorer:</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>EMA 21:</span>
                    <span className="font-mono">{regime.indicators.ema.ema21.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>EMA 55:</span>
                    <span className="font-mono">{regime.indicators.ema.ema55.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>EMA 200:</span>
                    <span className="font-mono">{regime.indicators.ema.ema200.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="mt-2 text-xs text-muted-foreground cursor-help truncate">
                    <Info className="h-3 w-3 inline mr-1" />
                    {regime.reasoning}
                  </p>
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px]">
                  <p className="text-xs">{regime.reasoning}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Sentiment Panel */}
          <div className={cn(
            "p-4 rounded-lg border",
            sentimentToBgColor(sentiment.type)
          )}>
            <div className="flex items-center gap-2 mb-3">
              <Newspaper className="h-4 w-4" />
              <span className="text-sm font-medium">Nyhets-sentiment</span>
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{sentimentToEmoji(sentiment.type)}</span>
              <div>
                <p className={cn("font-semibold", sentimentToColor(sentiment.type))}>
                  {sentimentToLabel(sentiment.type)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(sentiment.confidence * 100)}% konfidens
                </p>
              </div>
            </div>

            {/* Key Events */}
            {sentiment.keyEvents && sentiment.keyEvents.length > 0 && (
              <div className="mt-3 pt-3 border-t border-current/20">
                <p className="text-xs text-muted-foreground mb-2">Viktige hendelser:</p>
                <ul className="space-y-1">
                  {sentiment.keyEvents.slice(0, 2).map((event, i) => (
                    <li key={i} className="text-xs truncate">• {event}</li>
                  ))}
                </ul>
              </div>
            )}

            {sentiment.newsCount && (
              <p className="mt-2 text-xs text-muted-foreground">
                Basert på {sentiment.newsCount} nyheter
              </p>
            )}
          </div>
        </div>

        {/* Active Strategy */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-4 w-4 text-[#0052FF]" />
            <span className="text-sm font-medium">{t("activeAdjustment")}</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Posisjonsstørrelse</p>
              <p className={cn(
                "font-semibold",
                activeStrategy.positionSizeMul < 0.5 ? "text-red-600" : "text-green-600"
              )}>
                {Math.round(activeStrategy.positionSizeMul * 100)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Maks posisjoner</p>
              <p className="font-semibold">{activeStrategy.maxOpenPositions}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tilnærming</p>
              <p className="font-semibold capitalize">{activeStrategy.approach}</p>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            {activeStrategy.description}
          </p>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-right">
          Oppdatert: {new Date(updatedAt).toLocaleTimeString('no-NO')}
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Compact Version for Strategy Cards
// ============================================================================

interface MarketIntelligenceBadgeProps {
  regime?: MarketRegime;
  sentiment?: SentimentType;
  isBlocking?: boolean;
  className?: string;
}

export function MarketIntelligenceBadge({
  regime,
  sentiment,
  isBlocking,
  className,
}: MarketIntelligenceBadgeProps) {
  if (isBlocking) {
    return (
      <Badge variant="outline" className={cn("bg-red-100 text-red-700 border-red-300", className)}>
        <Ban className="h-3 w-3 mr-1" />
        Blokkert
      </Badge>
    );
  }

  if (!regime && !sentiment) {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        <Info className="h-3 w-3 mr-1" />
        Ingen data
      </Badge>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {regime && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={cn("cursor-help", regimeToBgColor(regime))}
              >
                <span className="mr-1">{regimeToEmoji(regime)}</span>
                {regimeToLabel(regime)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Markedsregime</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {sentiment && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={cn("cursor-help", sentimentToBgColor(sentiment))}
              >
                <Newspaper className="h-3 w-3 mr-1" />
                {sentimentToLabel(sentiment)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Nyhets-sentiment</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
