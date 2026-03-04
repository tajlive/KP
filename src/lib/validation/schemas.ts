import { z } from "zod";

// ─── Bot Actions ─────────────────────────────────────────
export const botActionSchema = z.object({
  action: z.enum(["pause", "resume", "stop"]),
});

// ─── Bot Alert Config ────────────────────────────────────
export const alertConfigSchema = z.object({
  drawdownThresholdPct: z.number().min(1).max(100).default(10),
  dailyLossLimitNok: z.number().min(0).nullable().optional(),
  notifyOnTrade: z.boolean().default(true),
  notifyOnError: z.boolean().default(true),
  notificationChannels: z
    .array(z.enum(["push", "email", "sms"]))
    .default(["push"]),
});

// ─── Onboarding Progress ────────────────────────────────
export const onboardingProgressSchema = z.object({
  currentStep: z.number().int().min(0).max(10),
  completedSteps: z.array(z.string()).default([]),
  riskProfile: z.enum(["conservative", "balanced", "aggressive"]).optional(),
  selectedStrategy: z.string().optional(),
  paperTradeCompleted: z.boolean().optional(),
});

// ─── Review ──────────────────────────────────────────────
export const reviewSchema = z.object({
  listingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().max(1000).optional(),
});

// ─── Copy Config ─────────────────────────────────────────
export const copyConfigSchema = z.object({
  maxAllocationNok: z.number().min(1000).max(500000),
  sizingMode: z.enum(["proportional", "fixed"]),
  maxLeverage: z.number().int().min(1).max(20),
  autoStopDrawdownPct: z.number().min(5).max(50),
});

// ─── Trading ─────────────────────────────────────────────
export const tradingTriggerSchema = z.object({
  strategyId: z.string().uuid(),
  signal: z.enum(["buy", "sell"]),
  symbol: z.string().min(1).max(20),
  amount: z.number().positive().optional(),
});

// ─── Type exports ────────────────────────────────────────
export type BotAction = z.infer<typeof botActionSchema>;
export type AlertConfig = z.infer<typeof alertConfigSchema>;
export type OnboardingProgress = z.infer<typeof onboardingProgressSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type CopyConfig = z.infer<typeof copyConfigSchema>;
export type TradingTrigger = z.infer<typeof tradingTriggerSchema>;
