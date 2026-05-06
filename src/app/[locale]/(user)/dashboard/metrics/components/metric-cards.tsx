import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";

interface BacktestMetrics {
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
}

interface MetricCardsProps {
  metrics: BacktestMetrics;
}

function MetricCard({
  label,
  value,
  goal,
  good,
}: {
  label: string;
  value: string;
  goal: string;
  good: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <div className="text-3xl font-bold">{value}</div>
          <Badge variant={good ? "default" : "outline"}>{goal}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Metrikkort for dashboard.
 * Rendrer deterministiske verdier - ingen locale-avhengig formatering.
 */
export function MetricCards({ metrics }: MetricCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <MetricCard
        label="Sharpe Ratio"
        value={metrics.sharpeRatio.toFixed(2)}
        goal=">1.5"
        good={metrics.sharpeRatio >= 1.5}
      />
      <MetricCard
        label="Win Rate"
        value={`${(metrics.winRate * 100).toFixed(1)}%`}
        goal=">80%"
        good={metrics.winRate >= 0.8}
      />
      <MetricCard
        label="Profit Factor"
        value={metrics.profitFactor.toFixed(2)}
        goal=">2.0"
        good={metrics.profitFactor >= 2.0}
      />
      <MetricCard
        label="Max Drawdown"
        value={`${metrics.maxDrawdownPct.toFixed(2)}%`}
        goal="<15%"
        good={metrics.maxDrawdownPct <= 15}
      />
    </div>
  );
}
