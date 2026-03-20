/**
 * Lucide-ikoner per strategitype — én kilde (ingen emoji i trading-UI).
 */
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  LayoutGrid,
  Shield,
  Target,
  TrendingUp,
} from "lucide-react";

export const STRATEGY_TYPE_ICONS: Record<string, LucideIcon> = {
  dca_trygg: Shield,
  trend_balansert: TrendingUp,
  multisignal_aktiv: Target,
  grid_bot: LayoutGrid,
  ai_copy: Bot,
};

export function getStrategyIconComponent(strategyKey: string): LucideIcon {
  return STRATEGY_TYPE_ICONS[strategyKey] ?? BarChart3;
}
