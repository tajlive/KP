/**
 * trade-explainer — norsk én-setnings-forklaring per trade (mega-plan Oppgave 2.2).
 *
 * Prioritet (ærlighet først):
 * 1. strategyReason — strategiens egen reason (simple_grid: allerede mormor-norsk) — ALDRI overskriv
 * 2. LLM (Kimi K3 via chatWithKimi) — validert mot forbudte påstander
 * 3. Hardkodet template — alltid korrekt, alltid tilgjengelig
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockChat = vi.fn();
vi.mock("@/lib/ai/providers", () => ({
  chatWithKimi: (...args: unknown[]) => mockChat(...args),
  KIMI_MODELS: { K3: "k3" },
}));

import { explainTrade, type TradeFacts } from "../trade-explainer";

const KJOP: TradeFacts = {
  side: "BUY",
  pair: "SOLUSDT",
  totalValueNok: 1000,
};

// NB (vitest-felle 2026-08-10): IKKE mockReset/mockClear i beforeEach på denne
// mocken — i kombinasjon med mockRejectedValue flagges rejectionen som
// "unhandled" selv når koden fanger den. Hver test setter sin egen
// implementasjon, og kall-telling sammenlignes relativt.

describe("explainTrade", () => {
  it("strategyReason finnes → brukes direkte, LLM kalles IKKE", async () => {
    const før = mockChat.mock.calls.length;
    const res = await explainTrade({
      ...KJOP,
      strategyReason: "Prisen falt 3,1 % under snittet — Piloten kjøpte billig (nivå 2).",
    });
    expect(res.source).toBe("strategy");
    expect(res.text).toContain("Piloten kjøpte billig");
    expect(mockChat.mock.calls.length).toBe(før);
  });

  it("LLM-suksess → LLM-tekst brukes (source: llm)", async () => {
    mockChat.mockResolvedValue({ content: "Jeg kjøpte litt Solana fordi prisen var lav." });
    const res = await explainTrade(KJOP);
    expect(res.source).toBe("llm");
    expect(res.text).toBe("Jeg kjøpte litt Solana fordi prisen var lav.");
  });

  it("LLM feiler (exception) → template-fallback (source: template)", async () => {
    mockChat.mockRejectedValue(new Error("KIMI API error: 401"));
    const res = await explainTrade(KJOP);
    expect(res.source).toBe("template");
    expect(res.text.length).toBeGreaterThan(10);
  });

  it("LLM med forbudt påstand (gevinstløfte) → template-fallback", async () => {
    mockChat.mockResolvedValue({ content: "Dette gir deg garantert gevinst!" });
    const res = await explainTrade(KJOP);
    expect(res.source).toBe("template");
  });

  it("LLM-timeout → template-fallback", async () => {
    mockChat.mockImplementation(
      () => new Promise((r) => setTimeout(() => r({ content: "For sent." }), 500)),
    );
    const res = await explainTrade(KJOP, { timeoutMs: 50 });
    expect(res.source).toBe("template");
  });

  it("template BUY: forklarer kjøp på mormor-norsk", async () => {
    mockChat.mockRejectedValue(new Error("nedetid"));
    const res = await explainTrade(KJOP);
    expect(res.text).toContain("SOL");
    expect(res.text).toContain("kjøpte");
  });

  it("template SELL med gevinst: nevner gevinst og trygge penger", async () => {
    mockChat.mockRejectedValue(new Error("nedetid"));
    const res = await explainTrade({
      side: "SELL", pair: "SOLUSDT", totalValueNok: 1050, realizedPnl: 50,
    });
    expect(res.text).toContain("gevinst");
  });

  it("template SELL med tap (stop-loss): ærlig om tapet", async () => {
    mockChat.mockRejectedValue(new Error("nedetid"));
    const res = await explainTrade({
      side: "SELL", pair: "SOLUSDT", totalValueNok: 950,
      realizedPnl: -50, exitReason: "stop_loss",
    });
    expect(res.text).toContain("tap");
    expect(res.text).not.toContain("gevinst");
  });

  it("useLlm: false → hopper over LLM selv om nøkkel finnes", async () => {
    const før = mockChat.mock.calls.length;
    const res = await explainTrade(KJOP, { useLlm: false });
    expect(res.source).toBe("template");
    expect(mockChat.mock.calls.length).toBe(før);
  });
});
