import { describe, it, expect } from "vitest";
import { getCriticalHeroCss } from "../critical-hero-css";

describe("critical-hero-css", () => {
  it("returns CSS that lets hero text paint before full stylesheet loads", () => {
    const css = getCriticalHeroCss();
    expect(css).toContain("font-family:");
    expect(css).toContain("var(--font-inter");
  });

  it("includes hero headline sizing so it paints before full stylesheet loads", () => {
    const css = getCriticalHeroCss();
    expect(css).toContain("font-size:");
    expect(css).toContain("clamp");
  });

  it("declares the gradient text styles for the hero subtitle line", () => {
    const css = getCriticalHeroCss();
    expect(css).toContain("background-clip: text");
    expect(css).toContain("color: transparent");
  });

  it("returns non-empty minified CSS", () => {
    const css = getCriticalHeroCss();
    expect(css.length).toBeGreaterThan(50);
  });
});
