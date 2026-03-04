import { HistoryStore } from "./history";

export type Side = "long" | "short";

export interface Position {
  id: string;
  asset: string;
  side: Side;
  entry: number;
  size: number;
  open: boolean;
  pnl: number;
}

export interface Order {
  id: string;
  asset: string;
  side: Side;
  size: number;
  type: "market" | "limit";
  limitPrice?: number;
}

export class SimulatorEngine {
  private prices: Record<string, number> = {};
  private positions: Position[] = [];
  private orders: Order[] = [];
  readonly history = new HistoryStore();

  setPrice(asset: string, price: number) {
    this.prices[asset] = price;
    this.history.log("price_update", { asset, price });
    this.updatePnL();
    this.matchLimitOrders(asset, price);
  }

  getPrice(asset: string) {
    return this.prices[asset] ?? null;
  }

  placeOrder(order: Order) {
    this.history.log("order_placed", order);
    if (order.type === "market") {
      return this.executeMarketOrder(order);
    }
    this.orders.push(order);
    return order;
  }

  private executeMarketOrder(order: Order) {
    const price = this.getPrice(order.asset);
    if (!price) throw new Error("No price available");

    const pos: Position = {
      id: crypto.randomUUID(),
      asset: order.asset,
      side: order.side,
      entry: price,
      size: order.size,
      open: true,
      pnl: 0,
    };

    this.positions.push(pos);
    this.history.log("position_opened", pos);
    this.updatePnL();
    return pos;
  }

  private matchLimitOrders(asset: string, price: number) {
    const matched = this.orders.filter(
      (o) => o.asset === asset && o.type === "limit" && o.limitPrice
    );

    matched.forEach((o) => {
      if (
        (o.side === "long" && price <= o.limitPrice!) ||
        (o.side === "short" && price >= o.limitPrice!)
      ) {
        this.executeMarketOrder({ ...o, type: "market" });
        this.orders = this.orders.filter((x) => x.id !== o.id);
        this.history.log("limit_order_filled", o);
      }
    });
  }

  closePosition(id: string) {
    const pos = this.positions.find((p) => p.id === id);
    if (!pos || !pos.open) return null;

    pos.open = false;
    this.updatePnL();
    this.history.log("position_closed", pos);
    return pos;
  }

  private updatePnL() {
    this.positions.forEach((p) => {
      if (!p.open) return;
      const price = this.getPrice(p.asset);
      if (!price) return;

      const diff =
        p.side === "long"
          ? (price - p.entry) / p.entry
          : (p.entry - price) / p.entry;

      p.pnl = diff * 100;
      this.history.log("pnl_update", {
        id: p.id,
        asset: p.asset,
        pnl: p.pnl,
      });
    });
  }

  getState() {
    return {
      prices: this.prices,
      positions: this.positions,
      orders: this.orders,
      last30Days: this.history.getLast30Days(),
    };
  }
}
