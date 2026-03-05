/**
 * Tester for bot-status-helpers.ts - KLA-100 Testplan
 */

import { describe, it, expect } from "vitest";
import {
  formatTimeAgo,
  formatTimeUntil,
  generateLastActionText,
  generateNextActionText,
  generateBotStatusMessage,
  isNewUser,
} from "./bot-status-helpers";
import type { Trade, UserStrategy } from "./trading-api";

describe("bot-status-helpers", () => {
  describe("formatTimeAgo", () => {
    it("should return 'akkurat nå' for recent timestamps", () => {
      const now = new Date();
      expect(formatTimeAgo(now)).toBe("akkurat nå");
    });

    it("should return correct minutes in Norwegian", () => {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60000);
      expect(formatTimeAgo(fiveMinsAgo)).toBe("for 5 minutter siden");
    });

    it("should return correct hours in Norwegian", () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60000);
      expect(formatTimeAgo(twoHoursAgo)).toBe("for 2 timer siden");
    });

    it("should return correct minutes in English", () => {
      const tenMinsAgo = new Date(Date.now() - 10 * 60000);
      expect(formatTimeAgo(tenMinsAgo, "en")).toBe("10 min ago");
    });

    it("should handle null", () => {
      expect(formatTimeAgo(null)).toBe("Ukjent tid");
    });
  });

  describe("formatTimeUntil", () => {
    it("should return correct minutes in Norwegian", () => {
      const in5Mins = new Date(Date.now() + 5 * 60000);
      expect(formatTimeUntil(in5Mins)).toBe("om 5 minutter");
    });

    it("should return correct hours in Norwegian", () => {
      const in2Hours = new Date(Date.now() + 2 * 60 * 60000);
      expect(formatTimeUntil(in2Hours)).toBe("om 2 timer");
    });

    it("should return 'Any moment now' for past dates in English", () => {
      const past = new Date(Date.now() - 1000);
      expect(formatTimeUntil(past, "en")).toBe("Any moment now");
    });

    it("should handle null", () => {
      expect(formatTimeUntil(null)).toBe("Ukjent");
    });
  });

  describe("generateLastActionText", () => {
    it("should return 'Ingen handler ennå' when no trade", () => {
      const result = generateLastActionText(null, "no");
      expect(result.text).toBe("Ingen handler ennå");
      expect(result.timestamp).toBeNull();
    });

    it("should return correct text for buy trade", () => {
      const trade: Trade = {
        id: "1",
        user_id: "user1",
        symbol: "BTC",
        side: "buy",
        price: 500000,
        quantity: 0.1,
        total_value: 50000,
        executed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        mode: "paper",
        strategy_signal: { signal: "rsi_oversold", indicators: { rsi: 25 } },
      };
      const result = generateLastActionText(trade, "no");
      expect(result.text).toContain("Kjøpte");
      expect(result.text).toContain("BTC");
      expect(result.explanation).toBe("RSI var oversolgt");
    });

    it("should return correct text for sell trade in English", () => {
      const trade: Trade = {
        id: "2",
        user_id: "user1",
        symbol: "ETH",
        side: "sell",
        price: 30000,
        quantity: 1,
        total_value: 30000,
        executed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        mode: "paper",
      };
      const result = generateLastActionText(trade, "en");
      expect(result.text).toContain("Sold");
      expect(result.text).toContain("ETH");
    });

    it("should detect RSI from indicators", () => {
      const trade: Trade = {
        id: "3",
        user_id: "user1",
        symbol: "BTC",
        side: "sell",
        price: 500000,
        quantity: 0.1,
        total_value: 50000,
        executed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        mode: "paper",
        strategy_signal: { indicators: { rsi: 75 } },
      };
      const result = generateLastActionText(trade, "no");
      expect(result.explanation).toBe("RSI var overkjøpt");
    });
  });

  describe("generateNextActionText", () => {
    it("should return default text when no strategy", () => {
      const result = generateNextActionText(null, "no");
      expect(result.text).toBe("Scanner markedet...");
      expect(result.explanation).toContain("hvert 5. minutt");
    });

    it("should return DCA text for dca_trygg strategy", () => {
      const strategy: UserStrategy = {
        id: "1",
        user_id: "user1",
        strategy_id: "dca_trygg",
        trading_pair: "BTC",
        mode: "paper",
        is_active: true,
        total_pnl: 0,
        total_trades: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const result = generateNextActionText(strategy, "no");
      expect(result.text).toBe("Neste DCA-kjøp");
      expect(result.explanation).toContain("hver uke");
    });

    it("should return grid text for grid_bot strategy", () => {
      const strategy: UserStrategy = {
        id: "2",
        user_id: "user1",
        strategy_id: "grid_bot",
        trading_pair: "ETH",
        mode: "paper",
        is_active: true,
        total_pnl: 100,
        total_trades: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const result = generateNextActionText(strategy, "en");
      expect(result.text).toBe("Monitoring grid levels");
    });

    it("should adjust interval for volatile market", () => {
      const strategy: UserStrategy = {
        id: "3",
        user_id: "user1",
        strategy_id: "dca_trygg",
        trading_pair: "BTC",
        mode: "paper",
        is_active: true,
        total_pnl: 0,
        total_trades: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const normalResult = generateNextActionText(strategy, "no", "normal");
      const volatileResult = generateNextActionText(strategy, "no", "volatile");
      
      // Volatile skal ha kortere intervall
      expect(volatileResult.nextCheckTime.getTime()).toBeLessThan(normalResult.nextCheckTime.getTime());
    });
  });

  describe("generateBotStatusMessage", () => {
    it("should generate complete message", () => {
      const trade: Trade = {
        id: "1",
        user_id: "user1",
        symbol: "BTC",
        side: "buy",
        price: 500000,
        quantity: 0.1,
        total_value: 50000,
        executed_at: new Date(Date.now() - 15 * 60000).toISOString(),
        created_at: new Date().toISOString(),
        mode: "paper",
        strategy_signal: { signal: "dca_trigger" },
      };
      const strategy: UserStrategy = {
        id: "1",
        user_id: "user1",
        strategy_id: "dca_trygg",
        trading_pair: "BTC",
        mode: "paper",
        is_active: true,
        total_pnl: 0,
        total_trades: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const result = generateBotStatusMessage(trade, strategy, "no");
      
      expect(result.lastActionText).toContain("Kjøpte");
      expect(result.lastActionText).toContain("for 15 minutter siden");
      expect(result.nextActionText).toBe("Neste DCA-kjøp");
      expect(result.statusExplanation).toBeTruthy();
    });
  });

  describe("isNewUser", () => {
    it("should return true for user with no strategies", () => {
      expect(isNewUser([], [])).toBe(true);
    });

    it("should return true for user with fewer than 3 trades", () => {
      const trades: Trade[] = [
        {
          id: "1",
          user_id: "user1",
          symbol: "BTC",
          side: "buy",
          price: 500000,
          quantity: 0.1,
          total_value: 50000,
          executed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          mode: "paper",
        },
      ];
      const strategies: UserStrategy[] = [
        {
          id: "1",
          user_id: "user1",
          strategy_id: "dca_trygg",
          trading_pair: "BTC",
          mode: "paper",
          is_active: true,
          total_pnl: 0,
          total_trades: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      expect(isNewUser(trades, strategies)).toBe(true);
    });

    it("should return false for experienced user", () => {
      const trades: Trade[] = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        user_id: "user1",
        symbol: "BTC",
        side: "buy",
        price: 500000,
        quantity: 0.1,
        total_value: 50000,
        executed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        mode: "paper",
      }));
      const strategies: UserStrategy[] = [
        {
          id: "1",
          user_id: "user1",
          strategy_id: "dca_trygg",
          trading_pair: "BTC",
          mode: "paper",
          is_active: true,
          total_pnl: 1000,
          total_trades: 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      expect(isNewUser(trades, strategies, true)).toBe(false);
    });

    it("should return true when onboarding not completed", () => {
      expect(isNewUser([], [], false)).toBe(true);
    });
  });
});
