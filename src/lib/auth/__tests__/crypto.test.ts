import { describe, it, expect } from "vitest";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  constantTimeEqual,
} from "../crypto";

describe("OAuth crypto helpers", () => {
  describe("PKCE generation", () => {
    it("generates a base64url verifier", () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(verifier.length).toBeGreaterThanOrEqual(32);
    });

    it("produces a valid S256 challenge for a verifier", async () => {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(challenge).not.toBe(verifier);
    });

    it("is deterministic for the same verifier", async () => {
      const verifier =
        "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
      const c1 = await generateCodeChallenge(verifier);
      const c2 = await generateCodeChallenge(verifier);
      expect(c1).toBe(c2);
      // Known S256 value for the RFC 7636 example verifier.
      expect(c1).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    });

    it("produces different challenges for different verifiers", async () => {
      const v1 = generateCodeVerifier();
      const v2 = generateCodeVerifier();
      const c1 = await generateCodeChallenge(v1);
      const c2 = await generateCodeChallenge(v2);
      expect(c1).not.toBe(c2);
    });
  });

  describe("state generation", () => {
    it("generates UUID-shaped opaque states", () => {
      const state = generateState();
      expect(state).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("generates unique states", () => {
      const states = new Set(Array.from({ length: 50 }, generateState));
      expect(states.size).toBe(50);
    });
  });

  describe("constantTimeEqual", () => {
    it("returns true for identical strings", () => {
      expect(constantTimeEqual("abc", "abc")).toBe(true);
      expect(constantTimeEqual("", "")).toBe(true);
    });

    it("returns false for different strings", () => {
      expect(constantTimeEqual("abc", "abd")).toBe(false);
      expect(constantTimeEqual("abc", "ab")).toBe(false);
      expect(constantTimeEqual("ab", "abc")).toBe(false);
    });
  });
});
