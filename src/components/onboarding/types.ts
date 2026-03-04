import { LucideIcon } from "lucide-react";

export interface OnboardingProgress {
  user_id: string;
  step1_completed: boolean;
  step2_completed: boolean;
  step3_completed: boolean;
  step4_completed: boolean;
  step5_completed: boolean;
  step2_started_at?: string;
  is_completed: boolean;
  completed_at?: string;
}

export interface Step {
  id: number;
  title: string;
  icon: LucideIcon;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  risk: string;
}

export interface MockTrade {
  id: string;
  pair: string;
  side: "BUY" | "SELL";
  amount: number;
  pnlPercent: number;
  strategy: string;
  aiExplanation: string;
  timestamp: Date;
}
