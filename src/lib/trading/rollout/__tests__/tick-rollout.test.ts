import { describe, it, expect } from "vitest";
import { hashUserIdToBucket, shouldUseChallenger, getDarkFleetConfigForUser } from "../tick-rollout";

describe("tick-rollout", () => {
  describe("hashUserIdToBucket", () => {
    it("returns consistent value for same user + salt", () => {
      const h1 = hashUserIdToBucket("user-123", "salt");
      const h2 = hashUserIdToBucket("user-123", "salt");
      expect(h1).toBe(h2);
      expect(h1).toBeGreaterThanOrEqual(0);
      expect(h1).toBeLessThan(1);
    });

    it("returns different values for different users", () => {
      const h1 = hashUserIdToBucket("user-123", "salt");
      const h2 = hashUserIdToBucket("user-456", "salt");
      expect(h1).not.toBe(h2);
    });

    it("returns different values for different salts", () => {
      const h1 = hashUserIdToBucket("user-123", "salt-a");
      const h2 = hashUserIdToBucket("user-123", "salt-b");
      expect(h1).not.toBe(h2);
    });

    it("distributes users roughly evenly", () => {
      const buckets: number[] = [];
      for (let i = 0; i < 1000; i++) {
        buckets.push(hashUserIdToBucket(`user-${i}`, "salt"));
      }
      const below50 = buckets.filter((b) => b < 0.5).length;
      expect(below50).toBeGreaterThan(450);
      expect(below50).toBeLessThan(550);
    });
  });

  describe("shouldUseChallenger", () => {
    it("returns champion when rollout is 0%", () => {
      const result = shouldUseChallenger("user-123", { challengerPercent: 0, salt: "salt", minTradesForEvaluation: 20 });
      expect(result.version).toBe("champion");
    });

    it("returns challenger when rollout is 100%", () => {
      const result = shouldUseChallenger("user-123", { challengerPercent: 100, salt: "salt", minTradesForEvaluation: 20 });
      expect(result.version).toBe("challenger");
    });

    it("splits users deterministically at 50%", () => {
      const champions: string[] = [];
      const challengers: string[] = [];

      for (let i = 0; i < 100; i++) {
        const userId = `user-${i}`;
        const result = shouldUseChallenger(userId, { challengerPercent: 50, salt: "salt", minTradesForEvaluation: 20 });
        if (result.version === "champion") champions.push(userId);
        else challengers.push(userId);
      }

      expect(champions.length).toBeGreaterThan(40);
      expect(champions.length).toBeLessThan(60);
      expect(champions.length + challengers.length).toBe(100);
    });

    it("same user always gets same version", () => {
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(shouldUseChallenger("user-abc", { challengerPercent: 50, salt: "salt", minTradesForEvaluation: 20 }).version);
      }
      expect(new Set(results).size).toBe(1);
    });
  });

  describe("getDarkFleetConfigForUser", () => {
    it("returns undefined when base config is disabled", () => {
      const result = getDarkFleetConfigForUser("user-123", { enabled: false, maxPositionSize: 0.1, threshold: 0.3 });
      expect(result).toBeUndefined();
    });
  });
});
