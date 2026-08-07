import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  shouldFallbackToDCA,
  pickDcaPair,
  computeDcaOrder,
} from "../strategy-fallback";

describe("shouldFallbackToDCA", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-07T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("utløser DCA når ingen fills på > 24 timer", () => {
    expect(
      shouldFallbackToDCA({
        lastFillAt: "2026-08-06T11:00:00Z", // 25 timer siden
        totalFills: 0,
      }),
    ).toBe(true);
  });

  it("utløser IKKE DCA når fills < 24 timer siden", () => {
    expect(
      shouldFallbackToDCA({
        lastFillAt: "2026-08-07T10:00:00Z", // 2 timer siden
        totalFills: 5,
      }),
    ).toBe(false);
  });

  it("utløser IKKE DCA når grid har produsert fills (selv om gamle)", () => {
    // Har fills → grid fungerer, fortsett
    expect(
      shouldFallbackToDCA({
        lastFillAt: "2026-08-01T00:00:00Z",
        totalFills: 10,
      }),
    ).toBe(false);
  });

  it("utløser DCA basert på firstRunAt når lastFillAt er null", () => {
    expect(
      shouldFallbackToDCA({
        lastFillAt: null,
        totalFills: 0,
        firstRunAt: "2026-08-06T11:00:00Z", // 25 timer siden oppstart
      }),
    ).toBe(true);
  });

  it("utløser IKKE DCA når ingen referansetid finnes", () => {
    expect(
      shouldFallbackToDCA({
        lastFillAt: null,
        totalFills: 0,
        firstRunAt: null,
      }),
    ).toBe(false);
  });

  it("respekterer egendefinert idleThresholdHours", () => {
    // 2 timer threshold, 3 timer siden → utløs
    expect(
      shouldFallbackToDCA({
        lastFillAt: "2026-08-07T09:00:00Z",
        totalFills: 0,
        idleThresholdHours: 2,
      }),
    ).toBe(true);

    // 2 timer threshold, 1 time siden → IKKE utløs
    expect(
      shouldFallbackToDCA({
        lastFillAt: "2026-08-07T11:00:00Z",
        totalFills: 0,
        idleThresholdHours: 2,
      }),
    ).toBe(false);
  });
});

describe("pickDcaPair", () => {
  it("velger paret med minst gap mellom nåpris og høyeste kjøpsordre", () => {
    const prices = {
      BTCUSDC: 64270,
      ETHUSDC: 1900,
      SOLUSDC: 72.6,
    };
    const gridLevels: Record<string, any[]> = {
      BTCUSDC: [
        {
          side: "buy",
          pair: "BTCUSDC",
          price: 62143,
          volume: "0.0002",
          status: "open",
        },
        {
          side: "buy",
          pair: "BTCUSDC",
          price: 64215,
          volume: "0.0002",
          status: "open",
        },
      ],
      ETHUSDC: [
        {
          side: "buy",
          pair: "ETHUSDC",
          price: 1821,
          volume: "0.005",
          status: "open",
        },
        {
          side: "buy",
          pair: "ETHUSDC",
          price: 1878,
          volume: "0.005",
          status: "open",
        },
      ],
      SOLUSDC: [
        {
          side: "buy",
          pair: "SOLUSDC",
          price: 70.11,
          volume: "0.12",
          status: "open",
        },
      ],
    };

    // BTC: gap = (64270-64215)/64270 = 0.086%
    // ETH: gap = (1900-1878)/1900 = 1.16%
    // SOL: gap = (72.6-70.11)/72.6 = 3.43%
    // → BTC har minst gap
    expect(
      pickDcaPair(["BTCUSDC", "ETHUSDC", "SOLUSDC"], gridLevels, prices),
    ).toBe("BTCUSDC");
  });

  it("returnerer null når ingen par har kjøpsordrer", () => {
    expect(pickDcaPair(["BTCUSDC"], { BTCUSDC: [] }, { BTCUSDC: 64000 })).toBe(
      null,
    );
  });

  it("returnerer null når pris mangler", () => {
    expect(
      pickDcaPair(
        ["BTCUSDC"],
        {
          BTCUSDC: [
            {
              side: "buy" as const,
              pair: "BTCUSDC",
              price: 64000,
              volume: "0.001",
              status: "open" as const,
            },
          ],
        } as any,
        { BTCUSDC: 0 },
      ),
    ).toBe(null);
  });
});

describe("computeDcaOrder", () => {
  it("Kjøper 10% av ledig USDC, maks $10", () => {
    const result = computeDcaOrder("BTCUSDC", 64000, 100);
    expect(result).not.toBeNull();
    expect(result!.amountUsdc).toBe(10); // 10% av 100 = 10, under max
    expect(result!.pair).toBe("BTCUSDC");
  });

  it("Kjøper maks $10 når 10% overskrider", () => {
    const result = computeDcaOrder("ETHUSDC", 1900, 500);
    expect(result).not.toBeNull();
    expect(result!.amountUsdc).toBe(10); // 10% av 500 = 50, capped til 10
  });

  it("returnerer null når freeUsdc < 5", () => {
    expect(computeDcaOrder("BTCUSDC", 64000, 4)).toBeNull();
  });

  it("returnerer null når currentPrice er 0", () => {
    expect(computeDcaOrder("BTCUSDC", 0, 100)).toBeNull();
  });

  it("beregner riktig volum", () => {
    const result = computeDcaOrder("SOLUSDC", 72, 50);
    expect(result).not.toBeNull();
    // 10% av 50 = $5 / $72 = 0.069...
    expect(result!.amountUsdc).toBe(5);
    expect(parseFloat(result!.volume)).toBeCloseTo(0.0694, 2);
  });
});
