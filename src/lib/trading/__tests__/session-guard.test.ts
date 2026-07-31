/**
 * Test: isSessionTradeable / sessionSkipReason — sesjons-forsvar (Task 0.3).
 *
 * En sesjon som er deaktivert av guard (status != 'active', eller
 * smart_trader_enabled=false, eller error_message LIKE 'GUARD:%') skal
 * ALDRI kunne handle — verken via tick, JokerTrade eller auto-traderen.
 */
import { describe, expect, it } from "vitest";
import {
  isSessionTradeable,
  sessionSkipReason,
  type TradeableSessionLike,
} from "../session-guard";

function session(overrides: Partial<TradeableSessionLike>): TradeableSessionLike {
  return {
    status: "active",
    smart_trader_enabled: true,
    error_message: null,
    ...overrides,
  };
}

describe("isSessionTradeable", () => {
  it("aktiv + enabled + ingen GUARD-feil → tradeable", () => {
    expect(isSessionTradeable(session({}))).toBe(true);
    expect(sessionSkipReason(session({}))).toBeNull();
  });

  it("status='stopped' → IKKE tradeable (guard-enforcement)", () => {
    const s = session({ status: "stopped" });
    expect(isSessionTradeable(s)).toBe(false);
    expect(sessionSkipReason(s)).toMatch(/status/);
  });

  it("status='crashed' og 'paused' → IKKE tradeable", () => {
    expect(isSessionTradeable(session({ status: "crashed" }))).toBe(false);
    expect(isSessionTradeable(session({ status: "paused" }))).toBe(false);
  });

  it("smart_trader_enabled=false → IKKE tradeable selv om status='active'", () => {
    const s = session({ smart_trader_enabled: false });
    expect(isSessionTradeable(s)).toBe(false);
    expect(sessionSkipReason(s)).toMatch(/smart_trader_enabled/i);
  });

  it("error_message LIKE 'GUARD:%' → IKKE tradeable selv om status='active'", () => {
    const s = session({
      error_message: "GUARD: Drawdown > 20 % — auto-deaktivert",
    });
    expect(isSessionTradeable(s)).toBe(false);
    expect(sessionSkipReason(s)).toMatch(/GUARD/);
  });

  it("error_message uten GUARD-prefiks → tradeable hvis ellers aktiv", () => {
    expect(
      isSessionTradeable(session({ error_message: "noe annet" })),
    ).toBe(true);
  });

  it("error_message=null → tradeable", () => {
    expect(isSessionTradeable(session({ error_message: null }))).toBe(true);
  });
});
