import { describe, it, expect } from "vitest";
import {
  getSymbolLotInfo,
  roundToLotSize,
} from "@/lib/trading/canonical/symbols/lot-sizes";

describe("lot-sizes — statisk symboltabell", () => {
  it("har gyldige verdier for alle Klarpakke-symboler (live-fiks 2026-08-01)", () => {
    // Regresjon: kun BTC/ETH var definert; ADA/DOGE etc. falt tilbake til
    // BTC-presisjon → Binance LOT_SIZE-reject (prod-bevis: 400 Filter failure).
    const cases: Record<string, { stepSize: number; minQty: number }> = {
      BTCUSDT: { stepSize: 0.00001, minQty: 0.00001 },
      ETHUSDT: { stepSize: 0.0001, minQty: 0.0001 },
      BNBUSDT: { stepSize: 0.001, minQty: 0.001 },
      SOLUSDT: { stepSize: 0.001, minQty: 0.001 },
      XRPUSDT: { stepSize: 0.1, minQty: 0.1 },
      ADAUSDT: { stepSize: 0.1, minQty: 0.1 },
      DOGEUSDT: { stepSize: 1, minQty: 1 },
      DOTUSDT: { stepSize: 0.01, minQty: 0.01 },
      LINKUSDT: { stepSize: 0.01, minQty: 0.01 },
      AVAXUSDT: { stepSize: 0.01, minQty: 0.01 },
      POLUSDT: { stepSize: 0.1, minQty: 0.1 },
    };
    for (const [symbol, expected] of Object.entries(cases)) {
      const info = getSymbolLotInfo(symbol);
      expect(info.stepSize, symbol).toBe(expected.stepSize);
      expect(info.minQty, symbol).toBe(expected.minQty);
    }
  });

  it("runder kvantum til gyldig step size per symbol", () => {
    // ADA stepSize 0.1 → 123.68 må bli 123.6 (ikke 123.68000)
    expect(roundToLotSize("ADAUSDT", 123.68)).toBe(123.6);
    // DOGE stepSize 1 → hele tokens
    expect(roundToLotSize("DOGEUSDT", 123.68)).toBe(123);
    // BTC stepSize 0.00001
    expect(roundToLotSize("BTCUSDT", 0.123456789)).toBe(0.12345);
    // ETH stepSize 0.0001
    expect(roundToLotSize("ETHUSDT", 0.123456)).toBe(0.1234);
  });

  it("MATICUSDT finnes ikke — bruk POLUSDT (delistet 2024)", () => {
    // Fallback for ukjente symboler er BTC-presisjon; MATIC skal aldri
    // brukes i nye ordrer.
    expect(getSymbolLotInfo("MATICUSDT").stepSize).toBe(0.00001);
    expect(getSymbolLotInfo("POLUSDT").stepSize).toBe(0.1);
  });
});
