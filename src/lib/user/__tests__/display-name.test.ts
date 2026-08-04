import { describe, expect, it } from "vitest";
import {
  generateDisplayNameSuggestion,
  validateDisplayName,
} from "../display-name";

describe("validateDisplayName", () => {
  it("godtar norske tegn, tall, mellomrom, bindestrek, understrek", () => {
    expect(validateDisplayName("NordlysWolf").ok).toBe(true);
    expect(validateDisplayName("Rask Rev 2").ok).toBe(true);
    expect(validateDisplayName("Ørn-47_Nord").ok).toBe(true);
    expect(validateDisplayName("Bjørn Ås").ok).toBe(true);
  });

  it("avviser for kort / for langt", () => {
    expect(validateDisplayName("A").ok).toBe(false);
    expect(validateDisplayName("").ok).toBe(false);
    expect(validateDisplayName("x".repeat(31)).ok).toBe(false);
    expect(validateDisplayName("x".repeat(30)).ok).toBe(true);
  });

  it("avviser HTML/injection og emoji", () => {
    expect(validateDisplayName("<script>alert(1)</script>").ok).toBe(false);
    expect(validateDisplayName("Rev🚀").ok).toBe(false);
    expect(validateDisplayName("test@example.com").ok).toBe(false);
  });

  it("trimmer whitespace", () => {
    const result = validateDisplayName("  RaskRev  ");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("RaskRev");
  });
});

describe("generateDisplayNameSuggestion", () => {
  it("gir norsk AdjektivDyr-format", () => {
    const suggestion = generateDisplayNameSuggestion();
    expect(suggestion.length).toBeGreaterThanOrEqual(5);
    expect(suggestion.length).toBeLessThanOrEqual(30);
    expect(validateDisplayName(suggestion).ok).toBe(true);
  });

  it("er deterministisk med seedet rng", () => {
    expect(generateDisplayNameSuggestion(() => 0)).toBe(
      generateDisplayNameSuggestion(() => 0),
    );
  });

  it("varierer med ulik rng", () => {
    const a = generateDisplayNameSuggestion(() => 0.1);
    const b = generateDisplayNameSuggestion(() => 0.9);
    expect(a).not.toBe(b);
  });
});
