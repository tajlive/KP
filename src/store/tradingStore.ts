import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Types
export interface Position {
  id: string;
  symbol: string;
  side: "long" | "short";
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  leverage: number;
  pnl: number;
  pnlPercent: number;
  openedAt: string;
  stopLoss?: number;
  takeProfit?: number;
}

export interface Trade {
  id: string;
  symbol: string;
  type: "buy" | "sell";
  side: "open" | "close";
  price: number;
  quantity: number;
  total: number;
  fee: number;
  pnl?: number;
  timestamp: string;
  strategy?: string;
}

export interface Portfolio {
  balance: number;
  equity: number;
  marginUsed: number;
  marginAvailable: number;
  totalPnl: number;
  totalPnlPercent: number;
  dayPnl: number;
  weekPnl: number;
  monthPnl: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  lastUpdate: string;
}

type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface OpenPositionResult {
  success: boolean;
  position?: Position;
  error?: string;
}

const MAX_LEVERAGE = 10;

interface TradingState {
  portfolio: Portfolio;
  positions: Position[];
  trades: Trade[];
  marketData: Record<string, MarketData>;
  selectedSymbol: string;
  selectedTimeframe: Timeframe;
  updateMarketData: (symbol: string, data: Partial<MarketData>) => void;
  openPosition: (
    position: Omit<
      Position,
      "id" | "currentPrice" | "pnl" | "pnlPercent" | "openedAt"
    >,
  ) => OpenPositionResult;
  closePosition: (positionId: string) => void;
  updatePosition: (positionId: string, currentPrice: number) => void;
  addTrade: (trade: Omit<Trade, "id" | "timestamp">) => void;
  setSelectedSymbol: (symbol: string) => void;
  setSelectedTimeframe: (timeframe: Timeframe) => void;
  resetPortfolio: () => void;
}

const INITIAL_BALANCE = 1_000_000;

const initialPortfolio: Portfolio = {
  balance: INITIAL_BALANCE,
  equity: INITIAL_BALANCE,
  marginUsed: 0,
  marginAvailable: INITIAL_BALANCE,
  totalPnl: 0,
  totalPnlPercent: 0,
  dayPnl: 0,
  weekPnl: 0,
  monthPnl: 0,
};

export const useTradingStore = create<TradingState>()(
  persist(
    (set, get) => ({
      portfolio: initialPortfolio,
      positions: [],
      trades: [],
      marketData: {},
      selectedSymbol: "BTCUSDT",
      selectedTimeframe: "15m",

      updateMarketData: (symbol, data) =>
        set((state) => ({
          marketData: {
            ...state.marketData,
            [symbol]: {
              ...state.marketData[symbol],
              symbol,
              ...data,
              lastUpdate: new Date().toISOString(),
            },
          },
        })),

      openPosition: (position): OpenPositionResult => {
        const state = get();

        // Valider leverage
        if (position.leverage > MAX_LEVERAGE) {
          return {
            success: false,
            error: `Leverage kan ikke overstige ${MAX_LEVERAGE}x`,
          };
        }

        // Valider margin
        const cost = position.entryPrice * position.quantity;
        const marginRequired = cost / position.leverage;
        if (marginRequired > state.portfolio.marginAvailable) {
          return { success: false, error: "Utilstrekkelig margin" };
        }

        const id = crypto.randomUUID();
        const currentPrice =
          state.marketData[position.symbol]?.price || position.entryPrice;

        const newPosition: Position = {
          ...position,
          id,
          currentPrice,
          pnl: 0,
          pnlPercent: 0,
          openedAt: new Date().toISOString(),
        };

        const newTrade: Trade = {
          id: crypto.randomUUID(),
          symbol: position.symbol,
          type: "buy",
          side: "open",
          price: position.entryPrice,
          quantity: position.quantity,
          total: cost,
          fee: cost * 0.001,
          timestamp: new Date().toISOString(),
        };

        set((s) => ({
          positions: [...s.positions, newPosition],
          trades: [newTrade, ...s.trades],
          portfolio: {
            ...s.portfolio,
            balance: s.portfolio.balance - cost,
            marginUsed: s.portfolio.marginUsed + marginRequired,
            marginAvailable: s.portfolio.marginAvailable - marginRequired,
          },
        }));

        return { success: true, position: newPosition };
      },

      closePosition: (positionId) =>
        set((state) => {
          const position = state.positions.find((p) => p.id === positionId);
          if (!position) return state;

          const closePrice = position.currentPrice;
          const pnl = position.pnl;
          const cost = position.entryPrice * position.quantity;
          const value = closePrice * position.quantity;
          const marginReleased = cost / position.leverage;

          const closeTrade: Trade = {
            id: crypto.randomUUID(),
            symbol: position.symbol,
            type: "sell",
            side: "close",
            price: closePrice,
            quantity: position.quantity,
            total: value,
            fee: value * 0.001,
            pnl: pnl,
            timestamp: new Date().toISOString(),
          };

          const newTotalPnl = state.portfolio.totalPnl + pnl;

          return {
            positions: state.positions.filter((p) => p.id !== positionId),
            trades: [closeTrade, ...state.trades],
            portfolio: {
              ...state.portfolio,
              balance: state.portfolio.balance + value,
              marginUsed: state.portfolio.marginUsed - marginReleased,
              marginAvailable: state.portfolio.marginAvailable + marginReleased,
              totalPnl: newTotalPnl,
              totalPnlPercent: (newTotalPnl / INITIAL_BALANCE) * 100,
            },
          };
        }),

      updatePosition: (positionId, currentPrice) =>
        set((state) => {
          const positions = state.positions.map((position) => {
            if (position.id !== positionId) return position;

            const priceDiff = currentPrice - position.entryPrice;
            const multiplier = position.side === "long" ? 1 : -1;
            const pnl =
              priceDiff * position.quantity * multiplier * position.leverage;
            const pnlPercent =
              (priceDiff / position.entryPrice) *
              100 *
              multiplier *
              position.leverage;

            return { ...position, currentPrice, pnl, pnlPercent };
          });

          const unrealizedPnl = positions.reduce((sum, p) => sum + p.pnl, 0);

          return {
            positions,
            portfolio: {
              ...state.portfolio,
              equity: state.portfolio.balance + unrealizedPnl,
            },
          };
        }),

      addTrade: (trade) =>
        set((state) => ({
          trades: [
            {
              ...trade,
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
            },
            ...state.trades,
          ],
        })),

      setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
      setSelectedTimeframe: (timeframe) =>
        set({ selectedTimeframe: timeframe }),
      resetPortfolio: () =>
        set({
          portfolio: initialPortfolio,
          positions: [],
          trades: [],
        }),
    }),
    {
      name: "klarpakke-trading-store",
      storage: createJSONStorage(() => {
        // SSR- og test-safe: returner no-op storage hvis localStorage ikke er tilgjengelig
        if (
          typeof window !== "undefined" &&
          typeof window.localStorage !== "undefined"
        ) {
          return window.localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        portfolio: state.portfolio,
        positions: state.positions,
        trades: state.trades,
      }),
    },
  ),
);
