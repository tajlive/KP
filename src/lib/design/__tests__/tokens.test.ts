import { describe, expect, it } from "vitest";
import { SEMANTIC_COLORS } from "../tokens";

describe("SEMANTIC_COLORS", () => {
  it("exports the Phase 1 Nordic Trust + Live Accents palette", () => {
    expect(SEMANTIC_COLORS.backgroundDark).toBe("#0b1220");
    expect(SEMANTIC_COLORS.backgroundDarkElevated).toBe("#111827");
    expect(SEMANTIC_COLORS.backgroundLight).toBe("#f8fafc");
    expect(SEMANTIC_COLORS.backgroundLightElevated).toBe("#e2e8f0");
    expect(SEMANTIC_COLORS.positive).toBe("#22c55e");
    expect(SEMANTIC_COLORS.negative).toBe("#ef4444");
    expect(SEMANTIC_COLORS.ai).toBe("#3b82f6");
    expect(SEMANTIC_COLORS.live).toBe("#f59e0b");
    expect(SEMANTIC_COLORS.learning).toBe("#a855f7");
    expect(SEMANTIC_COLORS.textDarkPrimary).toBe("#f8fafc");
    expect(SEMANTIC_COLORS.textDarkSecondary).toBe("#94a3b8");
    expect(SEMANTIC_COLORS.textLightPrimary).toBe("#0f172a");
    expect(SEMANTIC_COLORS.textLightSecondary).toBe("#64748b");
  });
});
