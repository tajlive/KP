import { describe, expect, it } from "vitest";
import { deriveE2eCopyLeaderEmail } from "../../../scripts/e2e-derive-copy-leader-email.mjs";

describe("deriveE2eCopyLeaderEmail", () => {
  it("legger til +e2e-copy-leader og normaliserer domene", () => {
    expect(deriveE2eCopyLeaderEmail("  tom@Example.COM  ")).toBe(
      "tom+e2e-copy-leader@example.com",
    );
  });

  it("stripper eksisterende pluss-subadresse før ny tag", () => {
    expect(
      deriveE2eCopyLeaderEmail("klarpakke.test+playwright@gmail.com"),
    ).toBe("klarpakke.test+e2e-copy-leader@gmail.com");
  });

  it("returnerer null uten @ eller tom local-part", () => {
    expect(deriveE2eCopyLeaderEmail("nope")).toBeNull();
    expect(deriveE2eCopyLeaderEmail("@x.co")).toBeNull();
  });
});
