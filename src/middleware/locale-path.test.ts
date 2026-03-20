import { describe, expect, it } from "vitest";
import {
  isGuestAuthRoute,
  parseLocalePath,
  sanitizePostAuthRedirect,
} from "./locale-path";

describe("parseLocalePath", () => {
  it("parses explicit locale prefix", () => {
    expect(parseLocalePath("/no/dashboard")).toEqual({
      locale: "no",
      strippedPath: "/dashboard",
    });
    expect(parseLocalePath("/en/konto")).toEqual({
      locale: "en",
      strippedPath: "/konto",
    });
  });

  it("defaults locale no when prefix omitted (as-needed)", () => {
    expect(parseLocalePath("/innlogging")).toEqual({
      locale: "no",
      strippedPath: "/innlogging",
    });
    expect(parseLocalePath("/dashboard")).toEqual({
      locale: "no",
      strippedPath: "/dashboard",
    });
  });

  it("handles root", () => {
    expect(parseLocalePath("/")).toEqual({ locale: "no", strippedPath: "/" });
  });
});

describe("sanitizePostAuthRedirect", () => {
  it("uses dashboard when missing or unsafe", () => {
    expect(sanitizePostAuthRedirect(null, "no")).toBe("/no/dashboard");
    expect(sanitizePostAuthRedirect("//evil.com", "no")).toBe("/no/dashboard");
    expect(sanitizePostAuthRedirect("/no/innlogging", "no")).toBe(
      "/no/dashboard",
    );
  });

  it("allows safe internal paths", () => {
    expect(sanitizePostAuthRedirect("/no/konto", "no")).toBe("/no/konto");
    expect(sanitizePostAuthRedirect("/en/profile", "en")).toBe("/en/profile");
  });

  it("allows admin login path", () => {
    expect(sanitizePostAuthRedirect("/no/admin/login", "no")).toBe(
      "/no/admin/login",
    );
  });
});

describe("isGuestAuthRoute", () => {
  it("matches guest auth paths", () => {
    expect(isGuestAuthRoute("/signup")).toBe(true);
    expect(isGuestAuthRoute("/innlogging")).toBe(true);
    expect(isGuestAuthRoute("/glemt-passord")).toBe(true);
    expect(isGuestAuthRoute("/login")).toBe(true);
    expect(isGuestAuthRoute("/registrer")).toBe(true);
  });

  it("excludes admin login", () => {
    expect(isGuestAuthRoute("/admin/login")).toBe(false);
  });
});
