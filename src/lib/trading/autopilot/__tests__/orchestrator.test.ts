/**
 * Autopilot Orchestrator (Task C1) — tester.
 *
 * Mocket KrakenClient + mocket AutopilotDb. Verifiserer hele pipelinen:
 *  1. Første kjøring (0 posisjoner) → grid-nivåer legges under nåpris
 *  2. Eksisterende posisjoner → fills detekteres, motsatt ordre + rebalansering
 *  3. Kill utløst (drawdown > 15 %) → ALL trading stoppet, ordrer kansellert
 *  4. Redusert modus (7–15 %) → halverte nivåstørrelser (mult 0.5)
 *  5. Reinvestering (gevinst > 10 USDC) → 80 % legges til idle-kapital
 *  6. DB-synk → autopilot_state oppdateres korrekt etter hver pipeline
 *  + per-bruker-isolasjon og nøkkel-feilhåndtering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { config as loadEnv } from "dotenv";

// ENCRYPTION_KEY (AES-256-GCM, 32-byte hex) — fra .env.local, med syntetisk
// fallback slik at testen er selvstendig. decryptApiKey leser env ved kall-tid.
loadEnv({ path: ".env.local" });
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = "a".repeat(64); // 32-byte hex-nøkkel for tester
}

import { encryptApiKey } from "@/lib/crypto/encrypt-api-keys";
import {
  processAutopilotUser,
  type AutopilotDb,
  type AutopilotStateRow,
  type KrakenKeysRow,
  type AutopilotStatePatch,
} from "../orchestrator";
import type { KrakenTicker } from "@/lib/exchanges/kraken/client";

// ---------- Mocket KrakenClient (klasse erstattes, metoder er vi.fn) ----------
const getBalanceMock = vi.hoisted(() => vi.fn());
const getTickerMock = vi.hoisted(() => vi.fn());
const getOpenOrdersMock = vi.hoisted(() => vi.fn());
const limitBuyMock = vi.hoisted(() => vi.fn());
const limitSellMock = vi.hoisted(() => vi.fn());
const cancelOrderMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/exchanges/kraken/client", () => {
  class MockKrakenClient {
    getBalance = getBalanceMock;
    getTicker = getTickerMock;
    getOpenOrders = getOpenOrdersMock;
    limitBuy = limitBuyMock;
    limitSell = limitSellMock;
    cancelOrder = cancelOrderMock;
  }
  return { KrakenClient: MockKrakenClient };
});

// ---------- Hjelpere ----------

/** Gyldig KrakenTicker med gitt siste-pris (c[0]). */
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

/** Default-priser per par (samme som scanner-testene). */
const PRICES: Record<string, string> = {
  XBTUSDC: "90000",
  ETHUSDC: "3000",
  SOLUSDC: "200",
  ADAUSDC: "1.2",
  DOTUSDC: "8",
};

/** Riktige Kraken-nøkler (krypteres med EKTE AES-GCM — dekrypteringsveien testes). */
async function keysRow(
  apiKey = "api-key-test",
  apiSecret = "api-secret-test",
): Promise<KrakenKeysRow> {
  return {
    api_key_encrypted: await encryptApiKey(apiKey),
    api_secret_encrypted: await encryptApiKey(apiSecret),
    is_active: true,
  };
}

function stateRow(
  overrides: Partial<AutopilotStateRow> = {},
): AutopilotStateRow {
  return {
    user_id: "u1",
    activated: true,
    current_equity_usdc: 150,
    drawdown_kill: false,
    five_pair_activated: false,
    grid_levels: {},
    initial_equity_usdc: 150,
    realized_profit_usdc: 0,
    last_run: "2026-08-06T00:00:00.000Z",
    updated_at: "2026-08-06T00:00:00.000Z",
    created_at: "2026-08-06T00:00:00.000Z",
    ...overrides,
  };
}

function makeDb(
  overrides: {
    keys?: KrakenKeysRow | null;
    state?: AutopilotStateRow | null;
  } = {},
) {
  const fetchKrakenKeys = vi.fn().mockResolvedValue(overrides.keys ?? null);
  const fetchAutopilotState = vi
    .fn()
    .mockResolvedValue(overrides.state ?? null);
  const saveAutopilotState = vi.fn().mockResolvedValue(undefined);
  const db: AutopilotDb = {
    fetchKrakenKeys,
    fetchAutopilotState,
    saveAutopilotState,
  };
  return { db, fetchKrakenKeys, fetchAutopilotState, saveAutopilotState };
}

/** Henter siste (userId, patch) sendt til saveAutopilotState (og kaster om ingen). */
function lastSaveCall(
  save: ReturnType<typeof vi.fn>,
): [string, AutopilotStatePatch] {
  const call = save.mock.calls[save.mock.calls.length - 1];
  if (!call) throw new Error("saveAutopilotState ble aldri kalt");
  return [call[0] as string, call[1] as AutopilotStatePatch];
}

let orderSeq = 0;

beforeEach(() => {
  vi.clearAllMocks();
  orderSeq = 0;

  getBalanceMock.mockResolvedValue({ USDC: "150", XXBT: "0" });
  getTickerMock.mockImplementation(async (pair: string) =>
    ticker(PRICES[pair] ?? "100"),
  );
  getOpenOrdersMock.mockResolvedValue({ open: {} });
  limitBuyMock.mockImplementation(async () => ({
    txid: [`buy-${++orderSeq}`],
  }));
  limitSellMock.mockImplementation(async () => ({
    txid: [`sell-${++orderSeq}`],
  }));
  cancelOrderMock.mockResolvedValue({});
});

describe("processAutopilotUser — første kjøring (0 posisjoner)", () => {
  it("legger grid-nivåer under nåpris for allokerte par og seedes initial_equity", async () => {
    const { db, saveAutopilotState } = makeDb({ keys: await keysRow() });
    // Balanse: kun USDC → ingen posisjoner → equity 150

    const result = await processAutopilotUser(db, "u1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.firstRun).toBe(true);
    expect(result.fills).toBe(0);
    expect(result.drawdown.level).toBe("normal");
    expect(result.allocation.map((a) => a.pair)).toEqual([
      "XBTUSDC",
      "ETHUSDC",
      "SOLUSDC",
    ]);

    // XBT (kapital 60 → 5 nivåer à 12 USDC): 89100 / 88200 / 87300 / 86400 / 85500
    expect(limitBuyMock).toHaveBeenCalledWith(
      "XBTUSDC",
      "0.00013468",
      "89100.0",
    );
    expect(limitBuyMock).toHaveBeenCalledWith(
      "XBTUSDC",
      "0.00014035",
      "85500.0",
    );
    // ETH (kapital 54 → 5 nivåer à 10.8 USDC)
    expect(limitBuyMock).toHaveBeenCalledWith(
      "ETHUSDC",
      "0.00363636",
      "2970.00",
    );
    // SOL init-nivå droppes på ordremin (volum 0.0405 < 0.06 × 1.1) — minste-ordre-guard virker
    expect(limitBuyMock).not.toHaveBeenCalledWith(
      "SOLUSDC",
      "0.04048583",
      "197.60",
    );
    // Idle: 150 USDC fri > 25 → nytt nivå på SOL (minst gap — ingen åpne kjøp)
    expect(limitBuyMock).toHaveBeenCalledWith(
      "SOLUSDC",
      "0.37955466",
      "197.60",
    );
    expect(result.newOrdersPlaced).toBe(11); // 5 XBT + 5 ETH + 1 idle
    expect(result.idleLevelsPlaced).toBe(1);

    // DB-synk: state opprettes med seedet initial_equity og grid-nivåene
    expect(saveAutopilotState).toHaveBeenCalledTimes(1);
    const [savedUserId, patch] = lastSaveCall(saveAutopilotState);
    expect(savedUserId).toBe("u1");
    expect(patch.activated).toBe(true);
    expect(patch.initial_equity_usdc).toBe(150);
    expect(patch.current_equity_usdc).toBe(150);
    expect(patch.drawdown_kill).toBe(false);
    expect(patch.five_pair_activated).toBe(false);
    expect(patch.realized_profit_usdc).toBe(0);
    expect(typeof patch.last_run).toBe("string");
    expect((patch.grid_levels.XBTUSDC ?? []).length).toBe(5);
    expect((patch.grid_levels.ETHUSDC ?? []).length).toBe(5);
    expect((patch.grid_levels.SOLUSDC ?? []).length).toBe(1);
    const xbtLevel = patch.grid_levels.XBTUSDC![0];
    expect(xbtLevel.side).toBe("buy");
    expect(xbtLevel.status).toBe("open");
    expect(xbtLevel.txid).toBe("buy-1");
  });
});

describe("processAutopilotUser — eksisterende posisjoner", () => {
  it("detekterer fills, legger trailing-salgsordre og rebalanserer", async () => {
    const state = stateRow({
      realized_profit_usdc: 5,
      grid_levels: {
        XBTUSDC: [
          {
            txid: "B1",
            side: "buy",
            pair: "XBTUSDC",
            price: 89000,
            volume: "0.0001",
            status: "open",
            placedAt: "2026-08-06T00:00:00.000Z",
          },
        ],
      },
    });
    const { db, saveAutopilotState } = makeDb({ keys: await keysRow(), state });
    // ETH-posisjon (0.04 × 3000 = 120) + 30 USDC → equity 150 (ingen kill)
    getBalanceMock.mockResolvedValue({ USDC: "30", XETH: "0.04" });
    getOpenOrdersMock.mockResolvedValue({ open: {} }); // B1 er borte → FILLED

    const result = await processAutopilotUser(db, "u1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fills).toBe(1);
    expect(result.realizedProfitUsdc).toBe(0); // kjøp-fill realiserer ingen gevinst

    // Fylt kjøp → trailing-salg @ 89000 × 1.02 = 90780 (XBT dec 1)
    expect(limitSellMock).toHaveBeenCalledWith("XBTUSDC", "0.0001", "90780.0");

    // Rebalansering: init-nivåer for ETH (tomt par med allokert kapital)
    expect(limitBuyMock).toHaveBeenCalledWith(
      "ETHUSDC",
      "0.00363636",
      "2970.00",
    );
    // Idle: 30 USDC fri > 25 → nytt nivå under XBT-nåpris (minst gap = 0, ingen åpne kjøp)
    expect(limitBuyMock).toHaveBeenCalledWith(
      "XBTUSDC",
      "0.00016835",
      "89100.0",
    );

    // State: XBT-lista har nå B1 (filled) + salgsordre + idle-kjøp
    const [, patch] = lastSaveCall(saveAutopilotState);
    const xbt = patch.grid_levels.XBTUSDC!;
    expect(xbt).toHaveLength(3);
    expect(xbt[0].status).toBe("filled");
    expect(xbt[1].side).toBe("sell");
    expect(xbt[1].buyPrice).toBe(89000);
    expect(xbt[1].refBuyTxid).toBe("B1");
    expect(patch.realized_profit_usdc).toBe(5); // ingen gevinst denne kjøringen
    expect(patch.current_equity_usdc).toBe(150);
  });

  it("registrerer gevinst ved fylt salgsordre og legger re-kjøp på samme nivå", async () => {
    const state = stateRow({
      realized_profit_usdc: 0,
      grid_levels: {
        XBTUSDC: [
          {
            txid: "S1",
            side: "sell",
            pair: "XBTUSDC",
            price: 90780,
            volume: "0.1",
            status: "open",
            buyPrice: 89000,
            refBuyTxid: "B0",
            placedAt: "2026-08-06T00:00:00.000Z",
          },
        ],
      },
    });
    const { db, saveAutopilotState } = makeDb({ keys: await keysRow(), state });
    getBalanceMock.mockResolvedValue({ USDC: "10", XXBT: "0.0015" }); // equity 145
    getOpenOrdersMock.mockResolvedValue({ open: {} }); // S1 er borte → FILLED

    const result = await processAutopilotUser(db, "u1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fills).toBe(1);

    // Gevinst = (90780 − 89000) × 0.1 − round-trip fee (0.26 %) = 131.26
    expect(result.realizedProfitUsdc).toBeCloseTo(131.26, 1);

    // Re-kjøp på samme nivå
    expect(limitBuyMock).toHaveBeenCalledWith("XBTUSDC", "0.1", "89000.0");

    // Reinvestering utløst: gevinst 131.26 > 10 → 80 % = 105.01 → idle-kapital
    expect(result.reinvestedUsdc).toBeCloseTo(105.01, 2);
    expect(result.idleLevelsPlaced).toBe(1);
    // Idle-pool = 10 USDC fri + 105.01 reinvestert → nivå à ~57.5 USDC på SOL
    // (minst gap — ingen åpne kjøp der)
    expect(limitBuyMock).toHaveBeenCalledWith(
      "SOLUSDC",
      "0.29101721",
      "197.60",
    );

    // State: kumulativ realisert gevinst
    const [, patch] = lastSaveCall(saveAutopilotState);
    expect(patch.realized_profit_usdc).toBeCloseTo(131.26, 1);
    expect(patch.grid_levels.XBTUSDC).toHaveLength(2); // S1 filled + re-kjøp
  });
});

describe("processAutopilotUser — kill-switch (drawdown > 15 %)", () => {
  it("kansellerer alle åpne ordrer, setter drawdown_kill og stopper ALL trading", async () => {
    const state = stateRow({
      grid_levels: {
        XBTUSDC: [
          {
            txid: "B1",
            side: "buy",
            pair: "XBTUSDC",
            price: 89000,
            volume: "0.0001",
            status: "open",
            placedAt: "2026-08-06T00:00:00.000Z",
          },
        ],
      },
    });
    const { db, saveAutopilotState } = makeDb({ keys: await keysRow(), state });
    getBalanceMock.mockResolvedValue({ USDC: "100" }); // equity 100 vs 150 → 33 % drawdown
    getOpenOrdersMock.mockResolvedValue({
      open: {
        O1: { descr: {} },
        O2: { descr: {} },
      },
    });

    const result = await processAutopilotUser(db, "u1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.killTriggered).toBe(true);
    expect(result.killed).toBe(true);
    expect(result.drawdown.level).toBe("kill");
    expect(result.cancelledOrders).toBe(2);
    expect(cancelOrderMock).toHaveBeenCalledWith("O1");
    expect(cancelOrderMock).toHaveBeenCalledWith("O2");

    // INGEN nye ordrer — verken kjøp, salg eller idle
    expect(limitBuyMock).not.toHaveBeenCalled();
    expect(limitSellMock).not.toHaveBeenCalled();

    // State: drawdown_kill=true, grid-nivåene urørt
    const [, patch] = lastSaveCall(saveAutopilotState);
    expect(patch.drawdown_kill).toBe(true);
    expect(patch.grid_levels.XBTUSDC).toHaveLength(1);
    expect(patch.current_equity_usdc).toBe(100);
  });

  it("ved allerede-aktiv kill skjer ingen kansellering eller nye ordrer (idempotent)", async () => {
    const state = stateRow({ drawdown_kill: true });
    const { db } = makeDb({ keys: await keysRow(), state });
    getBalanceMock.mockResolvedValue({ USDC: "120" });
    getOpenOrdersMock.mockResolvedValue({ open: { O1: { descr: {} } } });

    const result = await processAutopilotUser(db, "u1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.killed).toBe(true);
    expect(result.killTriggered).toBe(false);
    expect(cancelOrderMock).not.toHaveBeenCalled();
    expect(limitBuyMock).not.toHaveBeenCalled();
    expect(limitSellMock).not.toHaveBeenCalled();
  });
});

describe("processAutopilotUser — redusert modus (7–15 % drawdown)", () => {
  it("halverer nivåstørrelsene (levelSizeMultiplier 0.5) uten å stoppe grid", async () => {
    const state = stateRow({ grid_levels: {} }); // initial_equity 150, ingen ordrer ennå
    const { db, saveAutopilotState } = makeDb({ keys: await keysRow(), state });
    getBalanceMock.mockResolvedValue({ USDC: "135" }); // 10 % drawdown → reduced

    const result = await processAutopilotUser(db, "u1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.drawdown.level).toBe("reduced");
    expect(result.drawdown.levelSizeMultiplier).toBe(0.5);
    expect(result.killTriggered).toBe(false);

    // XBT-kapital 54 → normal nivå ville vært 10.8 USDC (0.00012121 BTC),
    // redusert modus gir 5.4 USDC (0.00006061 BTC) — halvert eksponering
    expect(limitBuyMock).toHaveBeenCalledWith(
      "XBTUSDC",
      "0.00006061",
      "89100.0",
    );
    expect(limitBuyMock).not.toHaveBeenCalledWith(
      "XBTUSDC",
      "0.00012121",
      expect.any(String),
    );

    // Grid fortsetter (ordrer legges) — kun størrelsen halveres
    expect(result.newOrdersPlaced).toBeGreaterThan(0);
    const [, patch] = lastSaveCall(saveAutopilotState);
    expect(patch.drawdown_kill).toBe(false);
    expect((patch.grid_levels.XBTUSDC ?? []).length).toBe(6); // 5 init + 1 idle (alle par gap=0, XBT kommer først)
  });
});

describe("processAutopilotUser — per-bruker-isolasjon", () => {
  it("én brukers kill påvirker ikke en annen brukers trading", async () => {
    // Bruker A: drawdown > 15 % → kill (sekvensiell — mocks deles mellom brukere,
    // så verdiene settes per kjøring for determinisme)
    const dbA = makeDb({
      keys: await keysRow(),
      state: stateRow({ user_id: "a", initial_equity_usdc: 150 }),
    });
    getBalanceMock.mockResolvedValue({ USDC: "100" }); // 33 % drawdown
    getOpenOrdersMock.mockResolvedValue({ open: { OA: { descr: {} } } });

    const a = await processAutopilotUser(dbA.db, "a");

    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.killed).toBe(true);
    expect(a.killTriggered).toBe(true);
    expect(a.cancelledOrders).toBe(1);
    expect(cancelOrderMock).toHaveBeenCalledWith("OA");
    expect(limitBuyMock).not.toHaveBeenCalled();
    expect(limitSellMock).not.toHaveBeenCalled();
    const [uidA, patchA] = lastSaveCall(dbA.saveAutopilotState);
    expect(uidA).toBe("a");
    expect(patchA.drawdown_kill).toBe(true);

    // Bruker B: frisk konto → første kjøring legger nivåer, helt upåvirket av A
    const dbB = makeDb({ keys: await keysRow() });
    getBalanceMock.mockResolvedValue({ USDC: "150" });
    getOpenOrdersMock.mockResolvedValue({ open: {} });

    const b = await processAutopilotUser(dbB.db, "b");

    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.killed).toBe(false);
    expect(b.newOrdersPlaced).toBeGreaterThan(0);
    expect(limitBuyMock).toHaveBeenCalledWith(
      "XBTUSDC",
      "0.00013468",
      "89100.0",
    );
    const [uidB, patchB] = lastSaveCall(dbB.saveAutopilotState);
    expect(uidB).toBe("b");
    expect(patchB.drawdown_kill).toBe(false);
  });
});

describe("processAutopilotUser — feilhåndtering", () => {
  it("bruker uten Kraken-nøkler → ok:false uten noen side-effekter", async () => {
    const { db, saveAutopilotState } = makeDb({ keys: null });

    const result = await processAutopilotUser(db, "u1");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("no_kraken_keys");
    expect(getBalanceMock).not.toHaveBeenCalled();
    expect(saveAutopilotState).not.toHaveBeenCalled();
  });

  it("korrupte krypterte nøkler → ok:false (feilen isoleres til brukeren)", async () => {
    const { db, saveAutopilotState } = makeDb({
      keys: {
        api_key_encrypted: "ugyldig-base64",
        api_secret_encrypted: "x",
        is_active: true,
      },
    });

    const result = await processAutopilotUser(db, "u1");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.length).toBeGreaterThan(0);
    expect(getBalanceMock).not.toHaveBeenCalled();
    expect(saveAutopilotState).not.toHaveBeenCalled();
  });
});
