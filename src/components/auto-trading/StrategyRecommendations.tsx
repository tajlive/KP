'use client';

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * STRATEGY RECOMMENDATIONS COMPONENT
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Displays:
 * - Current market regime with confidence badge
 * - Technical metrics (RSI, ADX, ATR, Volatility, Trend)
 * - AI reasoning in Norwegian
 * - Top recommended strategies
 * - Educational links
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft, 
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  Activity,
  Target,
  BarChart3,
  LineChart,
  BookOpen,
} from 'lucide-react';

interface MarketMetrics {
  rsi: number;
  adx: number;
  atr: number;
  atrPercent: number;
  volatility: number;
  trend: number;
  volumeTrend: number;
  priceVsSMA20: number;
  priceVsSMA50: number;
}

interface Strategy {
  id: string;
  name: string;
  description: string;
  riskLevel: string;
  expectedReturn: number;
  timeframe: string;
  score: number;
  matchReason: string;
}

interface EducationalLink {
  title: string;
  url: string;
  description: string;
}

interface RecommendationsData {
  success: boolean;
  symbol: string;
  timeframe: string;
  analysis: {
    regime: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'VOLATILE' | 'UNCERTAIN';
    confidence: number;
    metrics: MarketMetrics;
    reasoning: string;
  };
  strategies: Strategy[];
  recommendedApproach: string[];
  educationalLinks: EducationalLink[];
  timestamp: string;
}

interface Props {
  symbol?: string;
  timeframe?: string;
}

export function StrategyRecommendations({ symbol = 'BTCUSDT', timeframe = '1h' }: Props) {
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecommendations = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(
        `/api/auto-trading/recommendations?symbol=${symbol}&timeframe=${timeframe}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch recommendations');
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchRecommendations, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  // Get regime display info
  const getRegimeInfo = (regime: string) => {
    const info: Record<string, { label: string; color: string; icon: React.ReactNode; bgColor: string }> = {
      'TRENDING_UP': {
        label: 'Opptrend',
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900',
        icon: <TrendingUp className="h-5 w-5" />,
      },
      'TRENDING_DOWN': {
        label: 'Nedtrend',
        color: 'text-red-600',
        bgColor: 'bg-red-100 dark:bg-red-900',
        icon: <TrendingDown className="h-5 w-5" />,
      },
      'RANGING': {
        label: 'Sideways',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900',
        icon: <ArrowRightLeft className="h-5 w-5" />,
      },
      'VOLATILE': {
        label: 'Volatilt',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100 dark:bg-orange-900',
        icon: <AlertTriangle className="h-5 w-5" />,
      },
      'UNCERTAIN': {
        label: 'Usikkert',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100 dark:bg-gray-800',
        icon: <HelpCircle className="h-5 w-5" />,
      },
    };
    return info[regime] || info['UNCERTAIN'];
  };

  // Format percentage
  const formatPct = (val: number, decimals = 1) => `${val > 0 ? '+' : ''}${val.toFixed(decimals)}%`;

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200 dark:border-red-800">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-600 mb-2">Kunne ikke laste anbefalinger</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchRecommendations} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Prøv igjen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const regimeInfo = getRegimeInfo(data.analysis.regime);
  const confidence = Math.round(data.analysis.confidence * 100);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Markedsanalyse & Strategier
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {data.symbol} • {data.timeframe} • Oppdatert {new Date(data.timestamp).toLocaleTimeString('no-NO')}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchRecommendations}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Market Regime Badge */}
        <div className={`p-4 rounded-lg ${regimeInfo.bgColor} flex items-center gap-4`}>
          <div className={`p-3 rounded-full bg-white dark:bg-gray-800 ${regimeInfo.color}`}>
            {regimeInfo.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{regimeInfo.label}</span>
              <Badge variant={confidence > 70 ? 'default' : 'secondary'}>
                {confidence}% sikkerhet
              </Badge>
            </div>
            <p className={`text-sm ${regimeInfo.color} mt-1`}>
              {data.analysis.reasoning}
            </p>
          </div>
        </div>

        {/* Technical Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard 
            icon={<Target className="h-4 w-4" />}
            label="RSI (14)"
            value={data.analysis.metrics.rsi.toFixed(1)}
            subtext={data.analysis.metrics.rsi > 70 ? 'Overkjøpt' : data.analysis.metrics.rsi < 30 ? 'Oversolgt' : 'Nøytral'}
            color={data.analysis.metrics.rsi > 70 ? 'text-orange-500' : data.analysis.metrics.rsi < 30 ? 'text-blue-500' : 'text-green-500'}
          />
          <MetricCard 
            icon={<BarChart3 className="h-4 w-4" />}
            label="ADX"
            value={data.analysis.metrics.adx.toFixed(1)}
            subtext={data.analysis.metrics.adx > 25 ? 'Sterk trend' : 'Svak trend'}
            color={data.analysis.metrics.adx > 25 ? 'text-green-500' : 'text-gray-500'}
          />
          <MetricCard 
            icon={<Activity className="h-4 w-4" />}
            label="ATR"
            value={`${data.analysis.metrics.atrPercent.toFixed(2)}%`}
            subtext={data.analysis.metrics.atrPercent > 4 ? 'Høy volatilitet' : 'Normal'}
            color={data.analysis.metrics.atrPercent > 4 ? 'text-red-500' : 'text-green-500'}
          />
          <MetricCard 
            icon={<LineChart className="h-4 w-4" />}
            label="Trend"
            value={formatPct(data.analysis.metrics.trend * 100, 0)}
            subtext={data.analysis.metrics.trend > 0.2 ? 'Opp' : data.analysis.metrics.trend < -0.2 ? 'Ned' : 'Flat'}
            color={data.analysis.metrics.trend > 0.2 ? 'text-green-500' : data.analysis.metrics.trend < -0.2 ? 'text-red-500' : 'text-gray-500'}
          />
        </div>

        {/* Recommended Strategies */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Anbefalte Strategier
          </h4>
          <div className="space-y-3">
            {data.strategies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Ingen strategier tilgjengelig. Kontakt support.
              </p>
            ) : (
              data.strategies.map((strategy) => (
                <div 
                  key={strategy.id}
                  className="p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{strategy.name}</span>
                        <RiskBadge level={strategy.riskLevel} />
                        {strategy.score >= 80 && (
                          <Badge variant="default" className="text-xs">Beste match</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {strategy.description}
                      </p>
                      <p className="text-xs text-primary mt-2">
                        💡 {strategy.matchReason}
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Forventet avkastning: {strategy.expectedReturn}%/år</span>
                        <span>Timeframe: {strategy.timeframe}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Educational Links */}
        {data.educationalLinks.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Lær mer
            </h4>
            <div className="grid gap-2">
              {data.educationalLinks.map((link, idx) => (
                <a 
                  key={idx}
                  href={link.url}
                  className="flex items-center justify-between p-3 rounded-lg bg-accent hover:bg-accent/80 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{link.title}</p>
                    <p className="text-xs text-muted-foreground">{link.description}</p>
                  </div>
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Metric Card Component
function MetricCard({ 
  icon, 
  label, 
  value, 
  subtext, 
  color = 'text-muted-foreground' 
}: { 
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color?: string;
}) {
  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-lg font-semibold">{value}</div>
      <div className={`text-xs ${color}`}>{subtext}</div>
    </div>
  );
}

// Risk Badge Component
function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    'conservative': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'balanced': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'aggressive': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  };
  
  const labels: Record<string, string> = {
    'conservative': 'Konservativ',
    'balanced': 'Balansert',
    'aggressive': 'Aggressiv',
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded ${colors[level] || colors['balanced']}`}>
      {labels[level] || level}
    </span>
  );
}
