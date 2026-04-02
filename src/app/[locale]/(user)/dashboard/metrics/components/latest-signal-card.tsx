"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";

interface EnsembleSignal {
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  scores: {
    ta: number;
    ai: number;
    regime: number;
  };
  sizing: {
    kellyPct: number;
    maxRiskPct: number;
  };
  metadata: {
    timestamp: string;
  };
}

interface LatestSignalCardProps {
  signals: EnsembleSignal[];
}

/**
 * Formaterer ISO-timestamp til lesbar dato på norsk.
 * Bruker eksplisitt norsk locale for konsistent output på tvers av miljøer.
 */
function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    // Bruker toLocaleString med eksplisitt locale for å unngå hydration mismatch
    // da server og klient kan ha ulik default locale
    return date.toLocaleString("nb-NO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/**
 * Viser siste ensemble signal.
 * Client-only for å unngå hydration mismatch på datoformatering.
 */
export function LatestSignalCard({ signals }: LatestSignalCardProps) {
  if (!signals || signals.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest Ensemble Signal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {signals.map((s) => (
          <div
            key={s.symbol}
            className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-center gap-3">
              <Badge
                data-testid="ensemble-signal-badge"
                variant={
                  s.action === "BUY"
                    ? "default"
                    : s.action === "SELL"
                    ? "destructive"
                    : "secondary"
                }
              >
                {s.action}
              </Badge>
              <span className="font-semibold">{s.symbol}</span>
              <span
                data-testid="ensemble-confidence"
                className="text-muted-foreground text-sm"
              >
                Confidence {s.confidence}%
              </span>
              <span
                data-testid="ensemble-kelly"
                className="text-muted-foreground text-sm"
              >
                Kelly {(s.sizing.kellyPct * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDateTime(s.metadata.timestamp)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
