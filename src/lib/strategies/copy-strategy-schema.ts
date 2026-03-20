import { z } from "zod";

export const copyStrategyRiskLevelSchema = z.enum([
  "conservative",
  "balanced",
  "aggressive",
]);

export type CopyStrategyRiskLevel = z.infer<typeof copyStrategyRiskLevelSchema>;

export const copyStrategyRequestSchema = z
  .object({
    capitalAllocationNok: z.coerce
      .number()
      .min(1000, "validation_capitalMin")
      .max(50000, "validation_capitalMax"),
    riskLevel: copyStrategyRiskLevelSchema,
    autoStopLoss: z.boolean(),
    stopLossPercent: z.coerce.number().min(1).max(50).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.autoStopLoss) {
      if (data.stopLossPercent == null || Number.isNaN(data.stopLossPercent)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "validation_stopLossRequired",
          path: ["stopLossPercent"],
        });
      }
    }
  });

export type CopyStrategyRequest = z.infer<typeof copyStrategyRequestSchema>;

/** Mapper UI risikonivå til aktiv strategy_id i trading_sessions. */
export function riskLevelToStrategyId(
  risk: CopyStrategyRiskLevel,
): "dca_trygg" | "trend_balansert" | "multisignal_aktiv" {
  switch (risk) {
    case "conservative":
      return "dca_trygg";
    case "aggressive":
      return "multisignal_aktiv";
    default:
      return "trend_balansert";
  }
}
