import { describe, it, expect } from "vitest";
import { heroFontConfig } from "../hero-font-config";

describe("hero-font config", () => {
  it("uses display swap so hero text renders with fallback font early", () => {
    expect(heroFontConfig.display).toBe("swap");
  });

  it("preloads the latin subset", () => {
    expect(heroFontConfig.subsets).toContain("latin");
  });

  it("enables metric font fallback to reduce layout shift", () => {
    expect(heroFontConfig.adjustFontFallback).toBe(true);
  });

  it("preloads the font file", () => {
    expect(heroFontConfig.preload).toBe(true);
  });
});
