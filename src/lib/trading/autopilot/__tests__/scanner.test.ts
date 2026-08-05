import { describe, it, expect, vi } from "vitest";
import { scanPortfolio } from "../scanner";
import type { KrakenBalance, KrakenTicker } from "@/lib/exchanges/kraken/client";

/** Bygger en gyldig KrakenTicker med gitt siste-pris (c[0]). */
function ticker(price: string): KrakenTicker {
  return {
    a: [price, "1", "1"],
    b: [price, "1", "1"],
    c: [price, "1"],
    v: ["1", "1"],
    p: [price, price],
    t: [1, 1],
    l: [price, price],
    h: [price, price],
    o: price,
  };
}

type MockClient = {
  getBalance: ReturnType<typeof vi.fn>;
  getTicker: ReturnType<typeof vi.fn>;
};

function mockClient(
  balance: KrakenBalance,
  tickers: Record<string, KrakenTicker>,
): MockClient {
  return {
    getBalance: vi.fn().mockResolvedValue(balance),
    getTicker: vi.fn(async (pair: string) => tickers[pair]),
  };
}

describe("scanPortfolio", () => {
  it("henter balanse + ticker og returnerer posisjoner med verdi", async () => {
    const client = mockClient(
      { USDC: "250.25", XXBT: "0.01", XETH: "0.5" },
      { XBTUSDC: ticker("90000"), ETHUSDC: ticker("3000") },
    );

    const portfolio = await scanPortfolio(
      client as unknown as Parameters<typeof scanPortfolio>[0],
      ["XBTUSDC", "ETHUSDC"],
    );

    expect(portfolio.freeUsdc).toBeCloseTo(250.25, 8);
    expect(portfolio.positions).toHaveLength(2);

    const xbt = portfolio.positions.find((p) => p.pair === "XBTUSDC")!;
    expect(xbt.qty).toBeCloseTo(0.01, 8);
    expect(xbt.priceUsdc).toBeCloseTo(90000, 8);
    expect(xbt.valueUsdc).toBeCloseTo(900, 8);

    const eth = portfolio.positions.find((p) => p.pair === "ETHUSDC")!;
    expect(eth.qty).toBeCloseTo(0.5, 8);
    expect(eth.valueUsdc).toBeCloseTo(1500, 8);

    // equity = USDC + sum av posisjonsverdier
    expect(portfolio.equityUsdc).toBeCloseTo(250.25 + 900 + 1500, 8);
  });

  it("bruker legacy asset-navn XXBT/XETH fra PAIR_CFG når balansen leses (lærdommen: bal[XBT] er undefined)", async () => {
    const client = mockClient(
      { USDC: "100", XXBT: "0.02", XETH: "1.0" },
      { XBTUSDC: ticker("90000"), ETHUSDC: ticker("3000") },
    );

    const portfolio = await scanPortfolio(
      client as unknown as Parameters<typeof scanPortfolio>[0],
      ["XBTUSDC", "ETHUSDC"],
    );

    // Scanneren må spørre om ticker med par-navnet, og lese balansen med asset-feltet (XXBT/XETH)
    expect(client.getTicker).toHaveBeenCalledWith("XBTUSDC");
    expect(client.getTicker).toHaveBeenCalledWith("ETHUSDC");
    expect(portfolio.positions).toHaveLength(2);
    expect(portfolio.positions[0].qty).toBeCloseTo(0.02, 8);
    expect(portfolio.positions[1].qty).toBeCloseTo(1.0, 8);
  });

  it("håndterer asset uten legacy-prefiks (SOL)", async () => {
    const client = mockClient(
      { USDC: "50", SOL: "5" },
      { SOLUSDC: ticker("200") },
    );

    const portfolio = await scanPortfolio(
      client as unknown as Parameters<typeof scanPortfolio>[0],
      ["SOLUSDC"],
    );

    expect(portfolio.positions).toHaveLength(1);
    expect(portfolio.positions[0].pair).toBe("SOLUSDC");
    expect(portfolio.positions[0].valueUsdc).toBeCloseTo(1000, 8);
  });

  it("utelater posisjon når balansen kun har feil nøkkel (bal[XBT] = undefined) — kun USDC telles", async () => {
    const client = mockClient(
      { USDC: "100", XBT: "0.01" }, // feil nøkkel — riktig er XXBT
      {},
    );

    const portfolio = await scanPortfolio(
      client as unknown as Parameters<typeof scanPortfolio>[0],
      ["XBTUSDC"],
    );

    expect(portfolio.positions).toHaveLength(0);
    expect(portfolio.freeUsdc).toBeCloseTo(100, 8);
    expect(portfolio.equityUsdc).toBeCloseTo(100, 8);
    // Ingen ticker-kall når det ikke finnes noen balanse å prise
    expect(client.getTicker).not.toHaveBeenCalled();
  });

  it("utelater posisjoner med qty = 0", async () => {
    const client = mockClient(
      { USDC: "50", XXBT: "0.0000" },
      { XBTUSDC: ticker("90000") },
    );

    const portfolio = await scanPortfolio(
      client as unknown as Parameters<typeof scanPortfolio>[0],
      ["XBTUSDC"],
    );

    expect(portfolio.positions).toHaveLength(0);
    expect(portfolio.equityUsdc).toBeCloseTo(50, 8);
  });

  it("hopper over par som ikke finnes i PAIR_CFG uten å kaste", async () => {
    const client = mockClient(
      { USDC: "50", XXBT: "0.01" },
      { XBTUSDC: ticker("90000") },
    );

    const portfolio = await scanPortfolio(
      client as unknown as Parameters<typeof scanPortfolio>[0],
      ["XBTUSDC", "FOOUSDC"],
    );

    expect(portfolio.positions).toHaveLength(1);
    expect(portfolio.positions[0].pair).toBe("XBTUSDC");
    expect(client.getTicker).toHaveBeenCalledTimes(1);
  });

  it("kaller getBalance én gang og getTicker én gang per par", async () => {
    const client = mockClient(
      { USDC: "10", XXBT: "0.01", XETH: "0.5" },
      { XBTUSDC: ticker("90000"), ETHUSDC: ticker("3000") },
    );

    await scanPortfolio(
      client as unknown as Parameters<typeof scanPortfolio>[0],
      ["XBTUSDC", "ETHUSDC"],
    );

    expect(client.getBalance).toHaveBeenCalledTimes(1);
    expect(client.getTicker).toHaveBeenCalledTimes(2);
  });

  it("kaster når ticker mangler for et par med balanse (fail-safe — ikke undervurder equity)", async () => {
    const client = mockClient(
      { USDC: "10", XXBT: "0.01" },
      {}, // ingen ticker for XBTUSDC
    );

    await expect(
      scanPortfolio(
        client as unknown as Parameters<typeof scanPortfolio>[0],
        ["XBTUSDC"],
      ),
    ).rejects.toThrow(/Ticker mangler/);
  });

  it("returnerer kun USDC når pairs-listen er tom", async () => {
    const client = mockClient({ USDC: "123.45" }, {});

    const portfolio = await scanPortfolio(
      client as unknown as Parameters<typeof scanPortfolio>[0],
      [],
    );

    expect(portfolio.positions).toHaveLength(0);
    expect(portfolio.freeUsdc).toBeCloseTo(123.45, 8);
    expect(portfolio.equityUsdc).toBeCloseTo(123.45, 8);
  });
});
