import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  CircuitBreakerTimeoutError,
  krakenCircuitBreaker,
  priceFeedCircuitBreaker,
  generalApiCircuitBreaker,
  withCircuitBreaker,
  getAllCircuitBreakerMetrics,
  resetAllCircuitBreakers,
} from "../circuit-breaker";

describe("CircuitBreaker", () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: "test-breaker",
      failureThreshold: 3,
      resetTimeoutMs: 100,
      successThreshold: 2,
      requestTimeoutMs: 50,
    });
  });

  describe("Normal operation (CLOSED)", () => {
    it("executes successful functions", async () => {
      const result = await breaker.execute(async () => "success");
      expect(result).toBe("success");
      expect(breaker.getMetrics().state).toBe("CLOSED");
    });

    it("tracks success metrics", async () => {
      await breaker.execute(async () => "ok");
      const metrics = breaker.getMetrics();
      expect(metrics.successes).toBe(1);
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.consecutiveSuccesses).toBe(1);
    });

    it("resets failures on success", async () => {
      // Trigger 2 failures (not enough to open)
      await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});
      await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});
      expect(breaker.getMetrics().failures).toBe(2);

      // Success should reset failures
      await breaker.execute(async () => "ok");
      expect(breaker.getMetrics().failures).toBe(0);
    });
  });

  describe("Opening circuit", () => {
    it("opens after threshold failures", async () => {
      // 3 failures should open circuit
      await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});
      await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});
      await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});

      expect(breaker.getMetrics().state).toBe("OPEN");
    });

    it("rejects requests when OPEN", async () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});
      }

      await expect(breaker.execute(async () => "ok"))
        .rejects.toThrow(CircuitBreakerOpenError);
    });

    it("tracks rejected requests", async () => {
      for (let i = 0; i < 3; i++) {
        await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});
      }

      await breaker.execute(async () => "ok").catch(() => {});
      expect(breaker.getMetrics().rejectedRequests).toBe(1);
    });
  });

  describe("HALF_OPEN recovery", () => {
    it("transitions to HALF_OPEN after timeout", async () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});
      }
      expect(breaker.getMetrics().state).toBe("OPEN");

      // Wait for reset timeout
      await new Promise((r) => setTimeout(r, 150));

      // Next request should transition to HALF_OPEN and execute
      const result = await breaker.execute(async () => "recovery");
      expect(result).toBe("recovery");
      expect(breaker.getMetrics().state).toBe("HALF_OPEN");
    });

    it("closes after success threshold in HALF_OPEN", async () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});
      }

      // Wait and succeed twice (successThreshold = 2)
      await new Promise((r) => setTimeout(r, 150));
      await breaker.execute(async () => "ok");

      await new Promise((r) => setTimeout(r, 150));
      await breaker.execute(async () => "ok");

      expect(breaker.getMetrics().state).toBe("CLOSED");
    });

    it("re-opens on failure in HALF_OPEN", async () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});
      }

      // Wait and fail in HALF_OPEN
      await new Promise((r) => setTimeout(r, 150));
      await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});

      expect(breaker.getMetrics().state).toBe("OPEN");
    });
  });

  describe("Timeout", () => {
    it("throws timeout error for slow functions", async () => {
      await expect(
        breaker.execute(async () => {
          await new Promise((r) => setTimeout(r, 100)); // longer than 50ms timeout
          return "too late";
        })
      ).rejects.toThrow(CircuitBreakerTimeoutError);
    });
  });

  describe("Manual control", () => {
    it("forceState transitions circuit", () => {
      breaker.forceState("OPEN");
      expect(breaker.getMetrics().state).toBe("OPEN");

      breaker.forceState("CLOSED");
      expect(breaker.getMetrics().state).toBe("CLOSED");
    });

    it("reset clears state", async () => {
      for (let i = 0; i < 3; i++) {
        await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});
      }
      expect(breaker.getMetrics().state).toBe("OPEN");

      breaker.reset();
      expect(breaker.getMetrics().state).toBe("CLOSED");
      expect(breaker.getMetrics().failures).toBe(0);
    });

    it("isClosed returns correct status", async () => {
      expect(breaker.isClosed()).toBe(true);

      for (let i = 0; i < 3; i++) {
        await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});
      }
      expect(breaker.isClosed()).toBe(false);
    });
  });

  describe("withCircuitBreaker wrapper", () => {
    it("wraps function with breaker", async () => {
      const fn = async (x: number) => x * 2;
      const wrapped = withCircuitBreaker(fn, breaker);

      const result = await wrapped(5);
      expect(result).toBe(10);
    });
  });

  describe("Pre-configured breakers", () => {
    it("krakenCircuitBreaker has correct config", () => {
      const metrics = krakenCircuitBreaker.getMetrics();
      expect(metrics.state).toBe("CLOSED");
    });

    it("priceFeedCircuitBreaker has correct config", () => {
      const metrics = priceFeedCircuitBreaker.getMetrics();
      expect(metrics.state).toBe("CLOSED");
    });

    it("generalApiCircuitBreaker has correct config", () => {
      const metrics = generalApiCircuitBreaker.getMetrics();
      expect(metrics.state).toBe("CLOSED");
    });

    it("getAllCircuitBreakerMetrics returns all", () => {
      const all = getAllCircuitBreakerMetrics();
      expect(Object.keys(all)).toEqual(["kraken", "priceFeed", "general"]);
      expect(all.kraken.state).toBe("CLOSED");
    });

    it("resetAllCircuitBreakers resets all", () => {
      krakenCircuitBreaker.forceState("OPEN");
      resetAllCircuitBreakers();
      expect(krakenCircuitBreaker.getMetrics().state).toBe("CLOSED");
      expect(priceFeedCircuitBreaker.getMetrics().state).toBe("CLOSED");
      expect(generalApiCircuitBreaker.getMetrics().state).toBe("CLOSED");
    });
  });
});
