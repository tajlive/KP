/**
 * KLA-91 — Strategy marketplace metadata: Zod-skjema + typer + defaults.
 * UI: `StrategyMetadataForm` (next-intl namespace `strategyMarketplace.metadata`).
 */
import { z } from "zod";
import type { Database } from "@/types/database.types";

export type StrategyRow = Database["public"]["Tables"]["strategies"]["Row"];

/** next-intl namespace for felt / validering (bruk `useTranslations('strategyMarketplace.metadata')`). */
export const STRATEGY_METADATA_I18N_NS =
  "strategyMarketplace.metadata" as const;

export const strategyMetadataCategorySchema = z.enum([
  "dca",
  "trend",
  "grid",
  "ai_signal",
  "other",
]);

export const strategyMetadataRiskSchema = z.enum(["low", "medium", "high"]);

export const strategyMetadataPriceModelSchema = z.enum([
  "free",
  "subscription",
  "one_time",
]);

export const strategyMetadataSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "validation_titleMin")
      .max(120, "validation_titleMax"),
    description: z
      .string()
      .trim()
      .max(2000, "validation_descriptionMax")
      .optional()
      .default(""),
    category: strategyMetadataCategorySchema.default("other"),
    riskLevel: strategyMetadataRiskSchema,
    priceModel: strategyMetadataPriceModelSchema.default("free"),
    priceNok: z.coerce
      .number()
      .min(0, "validation_priceMin")
      .max(999_999, "validation_priceMax"),
    isPublic: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    const paid =
      data.priceModel === "subscription" || data.priceModel === "one_time";
    if (paid && data.priceNok <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "validation_priceRequired",
        path: ["priceNok"],
      });
    }
  });

export type StrategyMetadataFormValues = z.infer<typeof strategyMetadataSchema>;

export function defaultStrategyMetadataValues(
  partial?: Partial<StrategyMetadataFormValues>,
): StrategyMetadataFormValues {
  const base: StrategyMetadataFormValues = {
    title: "",
    description: "",
    category: "other",
    riskLevel: "medium",
    priceModel: "free",
    priceNok: 0,
    isPublic: false,
  };
  return { ...base, ...partial };
}

/** Mapper skjemafelt til kolonner som finnes på `public.strategies` (metadata-delen). */
export function strategyMetadataToStrategiesUpdate(
  values: StrategyMetadataFormValues,
): Pick<
  Database["public"]["Tables"]["strategies"]["Update"],
  "name" | "description" | "risk_level" | "strategy_type" | "is_public"
> & {
  subscription_fee_monthly?: number | null;
} {
  const strategyTypeMap: Record<
    z.infer<typeof strategyMetadataCategorySchema>,
    string
  > = {
    dca: "dca_trygg",
    trend: "trend_balansert",
    grid: "grid_bot",
    ai_signal: "multisignal_aktiv",
    other: "custom",
  };

  return {
    name: values.title,
    description: values.description || null,
    risk_level: values.riskLevel,
    strategy_type: strategyTypeMap[values.category],
    is_public: values.isPublic,
    subscription_fee_monthly:
      values.priceModel === "subscription" ? values.priceNok : null,
  };
}

/** Fyll skjema fra eksisterende strategi-rad (redigering). */
export function strategyRowToMetadataFormValues(
  row: Pick<
    StrategyRow,
    | "name"
    | "description"
    | "risk_level"
    | "strategy_type"
    | "is_public"
    | "subscription_fee_monthly"
  >,
): StrategyMetadataFormValues {
  const revMap: Record<
    string,
    z.infer<typeof strategyMetadataCategorySchema>
  > = {
    dca_trygg: "dca",
    trend_balansert: "trend",
    grid_bot: "grid",
    multisignal_aktiv: "ai_signal",
  };

  const cat = row.strategy_type
    ? (revMap[row.strategy_type] ?? "other")
    : "other";

  const risk = strategyMetadataRiskSchema.safeParse(row.risk_level);
  const price =
    row.subscription_fee_monthly != null && row.subscription_fee_monthly > 0
      ? {
          priceModel: "subscription" as const,
          priceNok: row.subscription_fee_monthly,
        }
      : { priceModel: "free" as const, priceNok: 0 };

  return defaultStrategyMetadataValues({
    title: row.name,
    description: row.description ?? "",
    category: cat,
    riskLevel: risk.success ? risk.data : "medium",
    isPublic: row.is_public ?? false,
    priceModel: price.priceModel,
    priceNok: price.priceNok,
  });
}
