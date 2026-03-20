import { describe, expect, it } from "vitest";
import { localizedPathname, parseLocalePath } from "./locale-path";

describe("localizedPathname", () => {
  it("default locale har ikke /no-prefiks", () => {
    expect(localizedPathname("no", "/innstillinger")).toBe("/innstillinger");
    expect(localizedPathname("no", "/dashboard/settings")).toBe(
      "/dashboard/settings",
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
