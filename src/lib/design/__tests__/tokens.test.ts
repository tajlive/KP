import { describe, expect, it } from "vitest";
import { SEMANTIC_COLORS } from "../tokens";

describe("SEMANTIC_COLORS", () => {
  it("exports the Phase 1 Nordic Trust + Live Accents palette", () => {
    expect(SEMANTIC_COLORS.backgroundDark).toBe("#0B1220");
    expect(SEMANTIC_COLORS.backgroundDarkElevated).toBe("#111827");
    expect(SEMANTIC_COLORS.backgroundLight).toBe("#F8FAFC");
    expect(SEMANTIC_COLORS.backgroundLightElevated).toBe("#E2E8F0");
    expect(SEMANTIC_COLORS.positive).toBe("#22C55E");
    expect(SEMANTIC_COLORS.negative).toBe("#EF4444");
    expect(SEMANTIC_COLORS.ai).toBe("#3B82F6");
    expect(SEMANTIC_COLORS.live).toBe("#F59E0B");
    expect(SEMANTIC_COLORS.learning).toBe("#A855F7");
    expect(SEMANTIC_COLORS.textDarkPrimary).toBe("#F8FAFC");
    expect(SEMANTIC_COLORS.textDarkSecondary).toBe("#94A3B8");
    expect(SEMANTIC_COLORS.textLightPrimary).toBe("#0F172A");
    expect(SEMANTIC_COLORS.textLightSecondary).toBe("#64748B");
  });
});
