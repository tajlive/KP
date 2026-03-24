import { describe, expect, it } from "vitest";
import {
  TRADING_INTEGRITY_SYNC,
  tradesPollIntervalAfterFailures,
} from "../trading-integrity-sync";

describe("tradesPollIntervalAfterFailures", () => {
  it("øker eksponentielt og capper", () => {
    const base = TRADING_INTEGRITY_SYNC.tradesPollIntervalMs;
    expect(tradesPollIntervalAfterFailures(0)).toBe(base);
    expect(tradesPollIntervalAfterFailures(1)).toBe(base * 2);
    expect(tradesPollIntervalAfterFailures(2)).toBe(base * 4);
    expect(tradesPollIntervalAfterFailures(99)).toBe(
      TRADING_INTEGRITY_SYNC.tradesPollBackoffMaxMs,
    );
  });
});
