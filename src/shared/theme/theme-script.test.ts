import { describe, it, expect } from "vitest";
import { getThemeInitScript } from "./theme-script";

describe("getThemeInitScript", () => {
  it("returns a self-contained script that does not reference external minified helpers", () => {
    const script = getThemeInitScript();

    // The bug in next-themes@0.4.6 is caused by the bundler injecting a
    // __name/t helper into a function that is later stringified and run as an
    // inline script. Our script must be a plain string so it can never inherit
    // such helpers.
    expect(script).not.toMatch(/\bt\(/);
    expect(script).not.toMatch(/\b__name\(/);
    expect(script).not.toMatch(/\b__name\b/);

    // Sanity-check that the script contains the expected logic.
    expect(script).toContain("localStorage.getItem");
    expect(script).toContain("classList.remove");
    expect(script).toContain("classList.add");
    expect(script).toContain('"theme"');
    expect(script).toContain('"system"');

    // Undefined arguments must be emitted as the literal `undefined`, not as
    // empty slots, because `fn(1,,2)` is a syntax error.
    expect(script).not.toMatch(/\([^)]*,,[^)]*\)/);
    expect(script).toContain('"system",undefined,["light","dark"],undefined,true,true)');
  });
});
