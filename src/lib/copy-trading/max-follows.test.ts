import { describe, expect, it } from "vitest";
import { maxActiveCopyFollowsForTier } from "./max-follows";

describe("maxActiveCopyFollowsForTier", () => {
  it("student får 2 aktive copy-follows (paper)", () => {
    expect(maxActiveCopyFollowsForTier("student")).toBe(2);
    expect(maxActiveCopyFollowsForTier("free")).toBe(2);
  });

  it("bachelor får 1", () => {
    expect(maxActiveCopyFollowsForTier("bachelor")).toBe(1);
  });

  it("master får 3", () => {
    expect(maxActiveCopyFollowsForTier("master")).toBe(3);
  });
});
