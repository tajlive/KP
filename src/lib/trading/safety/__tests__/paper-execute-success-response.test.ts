import { describe, expect, it } from "vitest";
import { paperExecuteSuccessResponseSchema } from "../paper-execute-success-response";

describe("paperExecuteSuccessResponseSchema", () => {
  it("accepts valid success payload", () => {
    const ok = paperExecuteSuccessResponseSchema.safeParse({
      success: true,
      trade_id: "550e8400-e29b-41d4-a716-446655440000",
      session_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      new_balance: 99500.5,
    });
    expect(ok.success).toBe(true);
  });

  it("rejects missing session_id", () => {
    const bad = paperExecuteSuccessResponseSchema.safeParse({
      success: true,
      trade_id: "550e8400-e29b-41d4-a716-446655440000",
      new_balance: 100,
    });
    expect(bad.success).toBe(false);
  });

  it("rejects success without trade_id", () => {
    const bad = paperExecuteSuccessResponseSchema.safeParse({
      success: true,
      session_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      new_balance: 100,
    });
    expect(bad.success).toBe(false);
  });
});
