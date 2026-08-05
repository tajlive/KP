/**
 * Kraken Grid Trading
 * Kjører grid-strategi på Kraken med USDT-par
 */

import { KrakenClient } from "@/lib/exchanges/kraken/client";
import { toKrakenSymbol } from "@/lib/exchanges/kraken/symbols";

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
    const { symbol, lowerPrice, upperPrice, gridLevels, capitalPerLevel } = this.config;
    const krakenPair = toKrakenSymbol(symbol);
    
    const priceStep = (upperPrice - lowerPrice) / (gridLevels - 1);
    
    for (let i = 0; i < gridLevels; i++) {
      const price = lowerPrice + (i * priceStep);
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
        
        console.info(`Grid order placed: ${order.side} ${order.volume} @ ${order.price}`);
      } catch (error) {
        console.error(`Failed to place order at level ${level}:`, error);
      }
    }
  }

  /**
   * Sjekker og håndterer fylte ordrer
   */
  async checkFills(): Promise<void> {
    const openOrders = await this.client.getOpenOrders();
    const openTxids = new Set(
      Object.values(openOrders).map((o: unknown) => (o as { txid: string }).txid),
    );
    
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
    const nextLevel = filledOrder.side === "buy" 
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
      
      console.info(`Opposite order placed: ${oppositeSide} ${nextOrder.volume} @ ${nextOrder.price}`);
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
  getStatus(): { total: number; pending: number; filled: number; cancelled: number } {
    let pending = 0, filled = 0, cancelled = 0;
    
    for (const order of this.orders.values()) {
      if (order.status === "pending") pending++;
      else if (order.status === "filled") filled++;
      else if (order.status === "cancelled") cancelled++;
    }
    
    return { total: this.orders.size, pending, filled, cancelled };
  }
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
