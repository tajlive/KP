import { describe, expect, it } from "vitest";
import { localizedPathname, parseLocalePath } from "./locale-path";

describe("localizedPathname", () => {
  it("default locale har /no-prefiks (localePrefix: always)", () => {
    expect(localizedPathname("no", "/profile")).toBe("/no/profile");
    expect(localizedPathname("no", "/dashboard/settings")).toBe(
      "/no/dashboard/settings",
    );
  });

  it("andre locales får prefiks", () => {
    expect(localizedPathname("en", "/profile")).toBe("/en/profile");
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

  it("/no/no/priser → locale no, strippedPath /no/priser (duplicate locale)", () => {
    expect(parseLocalePath("/no/no/priser")).toEqual({
      locale: "no",
      strippedPath: "/no/priser",
    });
  });

  it("/en/en/dashboard → locale en, strippedPath /en/dashboard (duplicate locale)", () => {
    expect(parseLocalePath("/en/en/dashboard")).toEqual({
      locale: "en",
      strippedPath: "/en/dashboard",
    });
  });
});
