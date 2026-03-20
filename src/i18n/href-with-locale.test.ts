import { describe, expect, it } from "vitest";
import { hrefWithLocale } from "./href-with-locale";

describe("hrefWithLocale (as-needed prefix)", () => {
  it("norsk (default): ingen /no-prefiks", () => {
    expect(hrefWithLocale("no", "/")).toBe("/");
    expect(hrefWithLocale("no", "/dashboard")).toBe("/dashboard");
    expect(hrefWithLocale("no", "/innlogging")).toBe("/innlogging");
  });

  it("engelsk: /en/...", () => {
    expect(hrefWithLocale("en", "/")).toBe("/en");
    expect(hrefWithLocale("en", "/dashboard")).toBe("/en/dashboard");
  });
});
