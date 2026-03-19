import { describe, expect, it } from "vitest";
import {
  defaultStrategyMetadataValues,
  strategyMetadataSchema,
  strategyMetadataToStrategiesUpdate,
} from "./strategy-form-gen";

describe("strategyMetadataSchema", () => {
  it("accepts valid free listing metadata", () => {
    const parsed = strategyMetadataSchema.safeParse(
      defaultStrategyMetadataValues({
        title: "Min strategi",
        priceModel: "free",
        priceNok: 0,
      }),
    );
    expect(parsed.success).toBe(true);
  });

  it("rejects paid model with zero price", () => {
    const parsed = strategyMetadataSchema.safeParse(
      defaultStrategyMetadataValues({
        title: "Betalt strategi",
        priceModel: "subscription",
        priceNok: 0,
      }),
    );
    expect(parsed.success).toBe(false);
  });

  it("maps form values to strategies update shape", () => {
    const values = defaultStrategyMetadataValues({
      title: "DCA BTC",
      category: "dca",
      riskLevel: "low",
      isPublic: true,
      priceModel: "subscription",
      priceNok: 99,
    });
    const update = strategyMetadataToStrategiesUpdate(values);
    expect(update.name).toBe("DCA BTC");
    expect(update.strategy_type).toBe("dca_trygg");
    expect(update.subscription_fee_monthly).toBe(99);
  });
});
