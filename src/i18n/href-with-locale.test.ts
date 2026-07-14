import { describe, expect, it } from "vitest";
import { hrefWithLocale } from "./href-with-locale";

describe("hrefWithLocale (always prefix)", () => {
  it("norsk: /no/...", () => {
    expect(hrefWithLocale("no", "/")).toBe("/no");
    expect(hrefWithLocale("no", "/dashboard")).toBe("/no/dashboard");
    expect(hrefWithLocale("no", "/login")).toBe("/no/login");
  });

  it("engelsk: /en/...", () => {
    expect(hrefWithLocale("en", "/")).toBe("/en");
    expect(hrefWithLocale("en", "/dashboard")).toBe("/en/dashboard");
  });
});
