/**
 * Test: isSessionTradeable / sessionSkipReason — sesjons-forsvar (Task 0.3).
 *
 * En sesjon som er deaktivert av guard (status != 'active' eller
 * error_message LIKE 'GUARD:%') skal ALDRI kunne handle — verken via
 * tick, PilotTrade eller auto-traderen.
 *
 * Regresjonsfiks 2026-07-31 kveld: smart_trader_enabled=false er IKKE et
 * deaktiveringssignal (DB-default false — DCA-/CryptoPilot-sesjoner har
 * enabled=false og SKAL trades av tick-motoren). Tidligere versjon av
 * denne testen krevde enabled=false → ikke tradeable; det frøs 24
 * legitime sesjoner i prod.
 */
import { describe, expect, it } from "vitest";
import {
  isSessionTradeable,
  sessionSkipReason,
  type TradeableSessionLike,
} from "../session-guard";

function session(
  overrides: Partial<TradeableSessionLike>,
): TradeableSessionLike {
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

  it("smart_trader_enabled=false UTEN guard-feil → TRADEABLE (DCA/CryptoPilot)", () => {
    // Regresjonstest: 24 sesjoner frøs i prod fordi enabled=false ble
    // tolket som deaktivering. Kolonnen har DB-default false.
    const s = session({ smart_trader_enabled: false });
    expect(isSessionTradeable(s)).toBe(true);
    expect(sessionSkipReason(s)).toBeNull();
  });

  it("smart_trader_enabled=false + GUARD-feil → IKKE tradeable (gammel guard)", () => {
    const s = session({
      smart_trader_enabled: false,
      error_message: "GUARD: Drawdown > 20 % — auto-deaktivert",
    });
    expect(isSessionTradeable(s)).toBe(false);
    expect(sessionSkipReason(s)).toMatch(/GUARD/);
  });

  it("error_message LIKE 'GUARD:%' → IKKE tradeable selv om status='active'", () => {
    const s = session({
      error_message: "GUARD: Drawdown > 20 % — auto-deaktivert",
    });
    expect(isSessionTradeable(s)).toBe(false);
    expect(sessionSkipReason(s)).toMatch(/GUARD/);
  });

  it("error_message uten GUARD-prefiks → tradeable hvis ellers aktiv", () => {
    expect(isSessionTradeable(session({ error_message: "noe annet" }))).toBe(
      true,
    );
  });

  it("error_message=null → tradeable", () => {
    expect(isSessionTradeable(session({ error_message: null }))).toBe(true);
  });

  it("next_expected_action_at i fremtiden → IKKE tradeable (backoff)", () => {
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const s = session({ next_expected_action_at: future });
    expect(isSessionTradeable(s)).toBe(false);
    expect(sessionSkipReason(s)).toMatch(/backoff/);
  });

  it("next_expected_action_at i fortiden → tradeable (backoff utløpt)", () => {
    const past = new Date(Date.now() - 60 * 1000).toISOString();
    const s = session({ next_expected_action_at: past });
    expect(isSessionTradeable(s)).toBe(true);
    expect(sessionSkipReason(s)).toBeNull();
  });

  it("next_expected_action_at=null → tradeable", () => {
    expect(isSessionTradeable(session({ next_expected_action_at: null }))).toBe(
      true,
    );
  });
});
