"use client";

import { Badge } from "@/shared/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import { 
  Newspaper, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  ShieldCheck,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketSentimentResult, SentimentRecommendation } from "@/lib/ai/sonar/types";

interface SonarSentimentBadgeProps {
  /** Sentiment data fra Sonar Pro */
  sentiment?: MarketSentimentResult | null;
  /** Om badge skal vise detaljert info */
  detailed?: boolean;
  /** Om badge skal vise loading state */
  loading?: boolean;
  /** Callback når bruker klikker for mer info */
  onClick?: () => void;
  /** Om komponenten skal være kompakt (kun ikon) */
  compact?: boolean;
  className?: string;
}

const RECOMMENDATION_CONFIG: Record<SentimentRecommendation, {
  label: { no: string; en: string };
  color: string;
  bgColor: string;
  icon: React.ElementType;
  description: { no: string; en: string };
}> = {
  buy: {
    label: { no: "Positivt", en: "Positive" },
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-950/50 border-green-300 dark:border-green-800",
    icon: TrendingUp,
    description: { 
      no: "Nyhetsbildet er positivt. Auto-trading fortsetter som normalt.",
      en: "News sentiment is positive. Auto-trading continues as normal."
    },
  },
  hold: {
    label: { no: "Nøytralt", en: "Neutral" },
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800",
    icon: Minus,
    description: { 
      no: "Nyhetsbildet er usikkert eller nøytralt. Auto-trading fortsetter med forsiktighet.",
      en: "News sentiment is uncertain or neutral. Auto-trading continues with caution."
    },
  },
  avoid: {
    label: { no: "Negativt", en: "Negative" },
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-800",
    icon: TrendingDown,
    description: { 
      no: "Negative nyheter oppdaget. Trades kan bli blokkert automatisk.",
      en: "Negative news detected. Trades may be blocked automatically."
    },
  },
};

/**
 * SonarSentimentBadge
 * 
 * Viser news-sentiment fra Perplexity Sonar Pro i auto-trading UI.
 * 
 * Bruk:
 * - I strategy cards for å vise sentiment for hver coin
 * - I dashboard for å vise overall market sentiment
 * - I trade details for å forklare hvorfor en trade ble blokkert
 * 
 * Regel for blocking:
 * - recommendation === 'avoid' OG confidence > 0.7 → blokker trade
 */
export function SonarSentimentBadge({
  sentiment,
  detailed = false,
  loading = false,
  onClick,
  compact = false,
  className,
}: SonarSentimentBadgeProps) {
  // Loading state
  if (loading) {
    return (
      <Badge 
        variant="outline" 
        className={cn("animate-pulse", className)}
      >
        <Newspaper className="h-3 w-3 mr-1" />
        Analyserer...
      </Badge>
    );
  }

  // Ingen sentiment data
  if (!sentiment) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn("text-muted-foreground", className)}
            >
              <Info className="h-3 w-3 mr-1" />
              Ingen data
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs max-w-[200px]">
              Sentiment-analyse ikke tilgjengelig. Auto-trading fortsetter basert på tekniske signaler.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const config = RECOMMENDATION_CONFIG[sentiment.recommendation];
  const Icon = config.icon;
  
  // Sjekk om dette er en blocking-tilstand
  const isBlocking = sentiment.recommendation === 'avoid' && sentiment.confidence > 0.7;
  
  // Kompakt modus (kun ikon)
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              role="button"
              tabIndex={0}
              className={cn(
                "inline-flex items-center justify-center rounded-full p-1.5 cursor-help",
                config.bgColor,
                className
              )}
              onClick={onClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick?.();
                }
              }}
            >
              <Icon className={cn("h-4 w-4", config.color)} />
              {isBlocking && (
                <AlertTriangle className="h-3 w-3 text-red-600 absolute -top-0.5 -right-0.5" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <div className="space-y-1 max-w-[250px]">
              <p className="font-medium text-sm">{config.label.no}</p>
              <p className="text-xs text-muted-foreground">{config.description.no}</p>
              {sentiment.news_count > 0 && (
                <p className="text-xs">{sentiment.news_count} nyheter analysert</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Standard badge
  const BadgeContent = (
    <Badge
      variant="outline"
      className={cn(
        "cursor-pointer transition-all duration-200 hover:opacity-80",
        config.bgColor,
        className
      )}
      onClick={onClick}
    >
      {isBlocking ? (
        <AlertTriangle className="h-3 w-3 mr-1 text-red-600" />
      ) : sentiment.recommendation === 'buy' ? (
        <ShieldCheck className="h-3 w-3 mr-1 text-green-600" />
      ) : (
        <Newspaper className={cn("h-3 w-3 mr-1", config.color)} />
      )}
      <span className={config.color}>{config.label.no}</span>
      {sentiment.confidence > 0 && (
        <span className="ml-1 text-xs opacity-70">
          {Math.round(sentiment.confidence * 100)}%
        </span>
      )}
    </Badge>
  );

  // Med tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {BadgeContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[300px]">
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4", config.color)} />
              <span className="font-medium">{config.label.no}</span>
              <span className="text-xs text-muted-foreground">
                ({Math.round(sentiment.confidence * 100)}% confidence)
              </span>
            </div>

            {/* Reasoning */}
            {sentiment.reasoning_excerpt && (
              <p className="text-xs text-muted-foreground">
                {sentiment.reasoning_excerpt}
              </p>
            )}

            {/* Key headlines */}
            {sentiment.key_headlines && sentiment.key_headlines.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium">Viktige nyheter:</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {sentiment.key_headlines.slice(0, 2).map((headline, i) => (
                    <li key={i} className="truncate">• {headline}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* News count */}
            <p className="text-xs text-muted-foreground">
              Basert på {sentiment.news_count} nyheter • Analysert {new Date(sentiment.analyzed_at).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
            </p>

            {/* Blocking warning */}
            {isBlocking && (
              <div className="flex items-center gap-2 p-2 bg-red-100 dark:bg-red-950/50 rounded text-xs">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span className="text-red-700 dark:text-red-400">
                  Auto-trading er midlertidig blokkert for {sentiment.symbol} på grunn av negative nyheter.
                </span>
              </div>
            )}

            {/* Sources */}
            {sentiment.sources && sentiment.sources.length > 0 && (
              <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-muted-foreground">
                  Kilder: {sentiment.sources.slice(0, 3).map(s => s.title).join(', ')}
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * SonarSentimentPanel
 * 
 * Utvidet visning av sentiment for dashboard/strategi-detailed view
 */
interface SonarSentimentPanelProps {
  sentiment: MarketSentimentResult | null;
  loading?: boolean;
  className?: string;
}

export function SonarSentimentPanel({
  sentiment,
  loading = false,
  className,
}: SonarSentimentPanelProps) {
  if (loading) {
    return (
      <div className={cn("p-4 border rounded-lg animate-pulse", className)}>
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-muted-foreground" />
          <span className="text-muted-foreground">Analyserer nyheter...</span>
        </div>
      </div>
    );
  }

  if (!sentiment) {
    return (
      <div className={cn("p-4 border rounded-lg bg-muted/50", className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info className="h-5 w-5" />
          <span>Ingen sentiment-data tilgjengelig</span>
        </div>
      </div>
    );
  }

  const config = RECOMMENDATION_CONFIG[sentiment.recommendation];
  const Icon = config.icon;
  const isBlocking = sentiment.recommendation === 'avoid' && sentiment.confidence > 0.7;

  return (
    <div className={cn(
      "p-4 border rounded-lg",
      config.bgColor,
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-full",
            sentiment.recommendation === 'buy' ? "bg-green-200 dark:bg-green-900" :
            sentiment.recommendation === 'avoid' ? "bg-red-200 dark:bg-red-900" :
            "bg-amber-200 dark:bg-amber-900"
          )}>
            <Icon className={cn("h-5 w-5", config.color)} />
          </div>
          <div>
            <h4 className="font-semibold">Nyhets-sentiment</h4>
            <p className="text-sm text-muted-foreground">
              {config.label.no} • {Math.round(sentiment.confidence * 100)}% confidence
            </p>
          </div>
        </div>
        
        {isBlocking && (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded text-xs font-medium">
            <AlertTriangle className="h-3 w-3" />
            Blokkert
          </div>
        )}
      </div>

      {/* Reasoning */}
      {sentiment.reasoning_excerpt && (
        <p className="text-sm mb-3">{sentiment.reasoning_excerpt}</p>
      )}

      {/* Key headlines */}
      {sentiment.key_headlines && sentiment.key_headlines.length > 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-sm font-medium">Viktige nyheter:</p>
          <ul className="space-y-1">
            {sentiment.key_headlines.map((headline, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-xs mt-1">•</span>
                {headline}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk flags */}
      {sentiment.risk_flags && sentiment.risk_flags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {sentiment.risk_flags.map((flag, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {flag}
            </Badge>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-300 dark:border-gray-700 text-xs text-muted-foreground">
        <span>{sentiment.news_count} nyheter analysert</span>
        <span>Analysert {new Date(sentiment.analyzed_at).toLocaleTimeString('no-NO')}</span>
      </div>

      {/* Sources */}
      {sentiment.sources && sentiment.sources.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-700">
          <p className="text-xs text-muted-foreground mb-2">Kilder:</p>
          <div className="flex flex-wrap gap-2">
            {sentiment.sources.slice(0, 4).map((source, i) => (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline truncate max-w-[150px]"
              >
                {source.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
