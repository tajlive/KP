/**
 * P0 Live Trading Dogfood Gate — tester
 *
 * Verifiserer at:
 * 1. Dogfood av → alle slipper gjennom
 * 2. Dogfood på → kun whitelist slipper gjennom
 * 3. Tom er i whitelist
 * 4. Ukjente brukere blokkeres
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  canUserAccessLiveTrading,
  isLiveTradingDogfood,
  liveTradingBlockReason,
  DOGFOOD_USER_IDS,
} from "@/lib/auth/live-trading-dogfood";

const TOM_ID = "0dd08529-b8a8-4fd3-9806-275e2d0135dd";
const UNKNOWN_ID = "00000000-0000-0000-0000-000000000000";

describe("live-trading-dogfood", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("isLiveTradingDogfood", () => {
    it("returnerer false når NEXT_PUBLIC_LIVE_TRADING_DOGFOOD ikke er satt", () => {
      vi.stubEnv("NEXT_PUBLIC_LIVE_TRADING_DOGFOOD", undefined);
      expect(isLiveTradingDogfood()).toBe(false);
    });

    it("returnerer true når NEXT_PUBLIC_LIVE_TRADING_DOGFOOD=true", () => {
      vi.stubEnv("NEXT_PUBLIC_LIVE_TRADING_DOGFOOD", "true");
      expect(isLiveTradingDogfood()).toBe(true);
    });

    it("returnerer false når NEXT_PUBLIC_LIVE_TRADING_DOGFOOD=false", () => {
      vi.stubEnv("NEXT_PUBLIC_LIVE_TRADING_DOGFOOD", "false");
      expect(isLiveTradingDogfood()).toBe(false);
    });
  });

  describe("canUserAccessLiveTrading", () => {
    it("alle slipper gjennom når dogfood er AV", () => {
      vi.stubEnv("NEXT_PUBLIC_LIVE_TRADING_DOGFOOD", undefined);
      expect(canUserAccessLiveTrading(UNKNOWN_ID)).toBe(true);
      expect(canUserAccessLiveTrading(TOM_ID)).toBe(true);
    });

    it("Tom slipper gjennom når dogfood er PÅ", () => {
      vi.stubEnv("NEXT_PUBLIC_LIVE_TRADING_DOGFOOD", "true");
      expect(canUserAccessLiveTrading(TOM_ID)).toBe(true);
    });

    it("ukjent bruker blokkeres når dogfood er PÅ", () => {
      vi.stubEnv("NEXT_PUBLIC_LIVE_TRADING_DOGFOOD", "true");
      expect(canUserAccessLiveTrading(UNKNOWN_ID)).toBe(false);
    });

    it("Tom er i DOGFOOD_USER_IDS", () => {
      expect(DOGFOOD_USER_IDS.has(TOM_ID)).toBe(true);
    });
  });

  describe("liveTradingBlockReason", () => {
    it("returnerer null for whitelisted bruker", () => {
      vi.stubEnv("NEXT_PUBLIC_LIVE_TRADING_DOGFOOD", "true");
      expect(liveTradingBlockReason(TOM_ID)).toBeNull();
    });

    it("returnerer norsk melding for blokkert bruker", () => {
      vi.stubEnv("NEXT_PUBLIC_LIVE_TRADING_DOGFOOD", "true");
      const reason = liveTradingBlockReason(UNKNOWN_ID);
      expect(reason).toBeTruthy();
      expect(reason).toContain("beta");
    });

    it("returnerer null når dogfood er AV", () => {
      vi.stubEnv("NEXT_PUBLIC_LIVE_TRADING_DOGFOOD", undefined);
      expect(liveTradingBlockReason(UNKNOWN_ID)).toBeNull();
    });
  });
});
