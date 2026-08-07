/**
 * Kraken Grid Trading
 * Kjører grid-strategi på Kraken med USDT-par
 */

import { KrakenClient } from "@/lib/exchanges/kraken/client";
import { toKrakenSymbol, KRAKEN_FEE } from "@/lib/exchanges/kraken/symbols";
import { PAIR_CFG, TRAIL_SELL_PCT } from "./kraken-grid-config.mjs";

/** PAIR_CFG er JS (.mjs) med infererte literale nøkler — indekser via Record. */
const PAIR_CFG_LOOKUP = PAIR_CFG as unknown as Record<
  string,
  | {
      dec: number;
      ordremin: number;
      spacing: number;
      active: boolean;
      asset: string;
    }
  | undefined
>;

export interface GridConfig {
  symbol: string;
  lowerPrice: number;
  upperPrice: number;
  gridLevels: number;
  capitalPerLevel: number;
}

export interface GridOrder {
  level: number;
  price: number;
  side: "buy" | "sell";
  volume: string;
  orderId?: string;
  status: "pending" | "filled" | "cancelled";
}

export class KrakenGridTrader {
  private client: KrakenClient;
  private config: GridConfig;
  private orders: Map<number, GridOrder> = new Map();

  constructor(client: KrakenClient, config: GridConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Initialiserer grid med limit-ordrer
   */
  async initialize(): Promise<void> {
    const { symbol, lowerPrice, upperPrice, gridLevels, capitalPerLevel } =
      this.config;
    const krakenPair = toKrakenSymbol(symbol);

    const priceStep = (upperPrice - lowerPrice) / (gridLevels - 1);

    for (let i = 0; i < gridLevels; i++) {
      const price = lowerPrice + i * priceStep;
      const side = i < gridLevels / 2 ? "buy" : "sell";

      // Beregn volum basert på kapital per nivå
      const volume = (capitalPerLevel / price).toFixed(8);

      const order: GridOrder = {
        level: i,
        price,
        side,
        volume,
        status: "pending",
      };

      this.orders.set(i, order);
    }
  }

  /**
   * Plasserer alle grid-ordrer
   */
  async placeOrders(): Promise<void> {
    const krakenPair = toKrakenSymbol(this.config.symbol);

    for (const [level, order] of this.orders) {
      try {
        let result;

        if (order.side === "buy") {
          result = await this.client.limitBuy(
            krakenPair,
            order.volume,
            order.price.toFixed(2),
          );
        } else {
          // For sell-ordrer må vi ha balansen
          result = await this.client.limitSell(
            krakenPair,
            order.volume,
            order.price.toFixed(2),
          );
        }

        order.orderId = result.txid[0];
        order.status = "pending";

        console.info(
          `Grid order placed: ${order.side} ${order.volume} @ ${order.price}`,
        );
      } catch (error) {
        console.error(`Failed to place order at level ${level}:`, error);
      }
    }
  }

  /**
   * Sjekker og håndterer fylte ordrer
   */
  async checkFills(): Promise<void> {
    const openOrdersResp = await this.client.getOpenOrders();
    const openOrdersMap =
      ((openOrdersResp as Record<string, unknown>)?.open as Record<
        string,
        unknown
      >) ?? {};
    const openTxids = new Set(Object.keys(openOrdersMap));

    for (const [level, order] of this.orders) {
      if (order.orderId && !openTxids.has(order.orderId)) {
        // Ordre er fylt eller kansellert
        order.status = "filled";

        // Plasser motsatt ordre
        await this.placeOppositeOrder(order);
      }
    }
  }

  /**
   * Plasserer motsatt ordre når en ordre fylles
   */
  private async placeOppositeOrder(filledOrder: GridOrder): Promise<void> {
    const krakenPair = toKrakenSymbol(this.config.symbol);
    const oppositeSide = filledOrder.side === "buy" ? "sell" : "buy";

    // Finn neste pris-nivå
    const nextLevel =
      filledOrder.side === "buy"
        ? filledOrder.level + 1
        : filledOrder.level - 1;

    const nextOrder = this.orders.get(nextLevel);
    if (!nextOrder) return;

    try {
      let result;

      if (oppositeSide === "buy") {
        result = await this.client.limitBuy(
          krakenPair,
          nextOrder.volume,
          nextOrder.price.toFixed(2),
        );
      } else {
        result = await this.client.limitSell(
          krakenPair,
          nextOrder.volume,
          nextOrder.price.toFixed(2),
        );
      }

      nextOrder.orderId = result.txid[0];
      nextOrder.status = "pending";

      console.info(
        `Opposite order placed: ${oppositeSide} ${nextOrder.volume} @ ${nextOrder.price}`,
      );
    } catch (error) {
      console.error(`Failed to place opposite order:`, error);
    }
  }

  /**
   * Kansellerer alle grid-ordrer
   */
  async cancelAll(): Promise<void> {
    for (const [level, order] of this.orders) {
      if (order.orderId && order.status === "pending") {
        try {
          await this.client.cancelOrder(order.orderId);
          order.status = "cancelled";
        } catch (error) {
          console.error(`Failed to cancel order ${order.orderId}:`, error);
        }
      }
    }
  }

  /**
   * Henter grid-status
   */
  getStatus(): {
    total: number;
    pending: number;
    filled: number;
    cancelled: number;
  } {
    let pending = 0,
      filled = 0,
      cancelled = 0;

    for (const order of this.orders.values()) {
      if (order.status === "pending") pending++;
      else if (order.status === "filled") filled++;
      else if (order.status === "cancelled") cancelled++;
    }

    return { total: this.orders.size, pending, filled, cancelled };
  }
}

// ==================== Persistert grid-tick (Task C1 — autopilot-orchestrator) ====================

/**
 * En persistert grid-ordre — SSoT ligger i `autopilot_state.grid_levels`
 * (JSONB), ikke i minne. Orkestratoren leser → opererer → skriver tilbake.
 */
export interface PersistedGridOrder {
  /** Kraken txid — tom/undefined for ordrer som ennå ikke er plassert */
  txid?: string;
  side: "buy" | "sell";
  pair: string;
  price: number;
  volume: string;
  status: "open" | "filled" | "cancelled";
  /** Kjøpspris en sell-ordre refererer til (gevinst-beregning ved fill) */
  buyPrice?: number;
  /** txid på kjøpsordren en sell-ordre ble opprettet fra */
  refBuyTxid?: string;
  placedAt?: string;
}

export interface GridRunOptions {
  /** Eksisterende (persisterte) ordrer for paret — muteres IKKE (ren funksjon) */
  orders: PersistedGridOrder[];
  /** Round-trip taker-fee-estimat for gevinst-beregning (default 0.26 %) */
  feePct?: number;
}

export interface GridRunResult {
  /** Oppdatert ordre-liste (gamle + nye) — kalleren persisterer den */
  orders: PersistedGridOrder[];
  /** Antall fills detektert (kjøp-fill → salg, salg-fill → re-kjøp) */
  fills: number;
  /** Realisert gevinst denne kjøringen (etter fee), i USDC */
  realizedProfitUsdc: number;
  sellOrdersPlaced: number;
  rebuysPlaced: number;
}

/** Minimalt client-grensesnitt grid-tick-en trenger (dekkende for KrakenClient). */
export type GridTickClient = Pick<
  KrakenClient,
  "getOpenOrders" | "limitBuy" | "limitSell"
>;

/**
 * State-løs grid-tick per par (Task C1 — autopilot-orchestrator).
 *
 * Samme logikk som scripts/kraken-grid-manager.mjs (prod-verifisert 2026-08-05):
 * 1. Åpen ordre borte fra OpenOrders = FILLED.
 * 2. Fylt kjøp → legg salgsordre @ buyPrice × TRAIL_SELL_PCT (trailing +2 %).
 * 3. Fylt salg → gevinst realisert (etter round-trip fee) + ny kjøpsordre
 *    på samme nivå (re-kjøp).
 *
 * Bruker PAIR_CFG.dec for pris-avrunding. Ordre-lista eies av kalleren
 * (autopilot_state.grid_levels) — denne funksjonen muterer ikke input.
 */
export async function runGridTick(
  client: GridTickClient,
  pair: string,
  opts: GridRunOptions,
): Promise<GridRunResult> {
  const { orders, feePct = KRAKEN_FEE.TAKER } = opts;
  const krakenPair = toKrakenSymbol(pair);
  const cfg = PAIR_CFG_LOOKUP[pair];
  const dec = cfg?.dec ?? 2;

  const openOrdersResp = await client.getOpenOrders();
  const openOrdersMap =
    ((openOrdersResp as Record<string, unknown>)?.open as Record<
      string,
      unknown
    >) ?? {};
  const openTxids = new Set(Object.keys(openOrdersMap));

  // Snapshot (deep) — vi muterer resultatet mens vi prosesserer, og kalleren
  // skal aldri få sine state-objekter mutert (ren funksjon). NB: iterer INPUT
  // (fast lengde), aldri result.orders som vokser — ellers re-prosesseres nye
  // ordrer i uendelig løkke (worker-krasj sett i test).
  const updated = orders.map((o) => ({ ...o }));
  const result: GridRunResult = {
    orders: updated,
    fills: 0,
    realizedProfitUsdc: 0,
    sellOrdersPlaced: 0,
    rebuysPlaced: 0,
  };

  for (const original of orders) {
    if (original.status !== "open" || !original.txid) continue;
    if (openTxids.has(original.txid)) continue; // fortsatt åpen — ingen endring

    const order = updated.find((o) => o.txid === original.txid)!;

    // FILLED — ordren er borte fra OpenOrders
    order.status = "filled";
    result.fills++;

    if (order.side === "buy") {
      // Fylt kjøp → legg salgsordre +2 % over kjøpspris (trailing-salg)
      const sellPrice = +(order.price * TRAIL_SELL_PCT).toFixed(dec);
      try {
        const res = await client.limitSell(
          krakenPair,
          order.volume,
          sellPrice.toFixed(dec),
        );
        updated.push({
          txid: res.txid[0],
          side: "sell",
          pair,
          price: sellPrice,
          volume: order.volume,
          status: "open",
          buyPrice: order.price,
          refBuyTxid: order.txid,
          placedAt: new Date().toISOString(),
        });
        result.sellOrdersPlaced++;
      } catch (error) {
        console.error(`runGridTick: feil salgsordre for ${order.txid}:`, error);
      }
    } else {
      // Fylt salg → gevinst realisert + ny kjøpsordre på samme nivå
      const buyPrice = order.buyPrice ?? 0;
      const volume = parseFloat(order.volume) || 0;
      const fee = (order.price + buyPrice) * volume * feePct;
      result.realizedProfitUsdc += (order.price - buyPrice) * volume - fee;
      try {
        const res = await client.limitBuy(
          krakenPair,
          order.volume,
          buyPrice.toFixed(dec),
        );
        updated.push({
          txid: res.txid[0],
          side: "buy",
          pair,
          price: buyPrice,
          volume: order.volume,
          status: "open",
          placedAt: new Date().toISOString(),
        });
        result.rebuysPlaced++;
      } catch (error) {
        console.error(`runGridTick: feil re-kjøp for ${order.txid}:`, error);
      }
    }
  }

  return result;
}

// Hjelpefunksjon for enkel bruk
export async function runKrakenGrid(
  apiKey: string,
  apiSecret: string,
  config: GridConfig,
): Promise<KrakenGridTrader> {
  const client = new KrakenClient(apiKey, apiSecret);
  const grid = new KrakenGridTrader(client, config);

  await grid.initialize();
  await grid.placeOrders();

  return grid;
}
