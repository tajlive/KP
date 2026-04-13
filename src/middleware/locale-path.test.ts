import { describe, expect, it } from "vitest";
import { localizedPathname, parseLocalePath } from "./locale-path";

describe("localizedPathname", () => {
  it("default locale har /no-prefiks (localePrefix: always)", () => {
    expect(localizedPathname("no", "/innstillinger")).toBe("/no/innstillinger");
    expect(localizedPathname("no", "/dashboard/settings")).toBe(
      "/no/dashboard/settings",
    );
  });

  it("andre locales får prefiks", () => {
    expect(localizedPathname("en", "/innstillinger")).toBe("/en/innstillinger");
  });
});

describe("parseLocalePath + settings", () => {
  it("/settings → locale no", () => {
    expect(parseLocalePath("/settings")).toEqual({
      locale: "no",
      strippedPath: "/settings",
    });
  });

  it("/en/settings → locale en", () => {
    expect(parseLocalePath("/en/settings")).toEqual({
      locale: "en",
      strippedPath: "/settings",
    });
  });
});
