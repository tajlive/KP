import { create } from "zustand";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface RealtimeState {
  binanceStatus: ConnectionStatus;
  supabaseStatus: ConnectionStatus;
  subscribedSymbols: string[];
  lastPriceUpdate: number | null;
  priceCache: Record<
    string,
    {
      price: number;
      change24h: number;
      volume24h: number;
      high24h: number;
      low24h: number;
      timestamp: number;
    }
  >;

  setBinanceStatus: (status: ConnectionStatus) => void;
  setSupabaseStatus: (status: ConnectionStatus) => void;
  updatePrice: (
    symbol: string,
    data: {
      price: number;
      change24h?: number;
      volume24h?: number;
      high24h?: number;
      low24h?: number;
    },
  ) => void;
  updatePrices: (updates: Record<string, number>) => void;
  setSubscribedSymbols: (symbols: string[]) => void;
  getPrice: (symbol: string) => number | null;
  isConnected: () => boolean;
}

export const useRealtimeStore = create<RealtimeState>()((set, get) => ({
  binanceStatus: "disconnected",
  supabaseStatus: "disconnected",
  subscribedSymbols: [],
  lastPriceUpdate: null,
  priceCache: {},

  setBinanceStatus: (status) => set({ binanceStatus: status }),
  setSupabaseStatus: (status) => set({ supabaseStatus: status }),

  updatePrice: (symbol, data) =>
    set((state) => ({
      priceCache: {
        ...state.priceCache,
        [symbol]: {
          price: data.price,
          change24h: data.change24h ?? state.priceCache[symbol]?.change24h ?? 0,
          volume24h: data.volume24h ?? state.priceCache[symbol]?.volume24h ?? 0,
          high24h: data.high24h ?? state.priceCache[symbol]?.high24h ?? 0,
          low24h: data.low24h ?? state.priceCache[symbol]?.low24h ?? 0,
          timestamp: Date.now(),
        },
      },
      lastPriceUpdate: Date.now(),
    })),

  updatePrices: (updates) =>
    set((state) => {
      const nextCache = { ...state.priceCache };
      for (const [symbol, price] of Object.entries(updates)) {
        nextCache[symbol] = {
          ...nextCache[symbol],
          price,
          change24h: nextCache[symbol]?.change24h ?? 0,
          volume24h: nextCache[symbol]?.volume24h ?? 0,
          high24h: nextCache[symbol]?.high24h ?? 0,
          low24h: nextCache[symbol]?.low24h ?? 0,
          timestamp: Date.now(),
        };
      }
      return { priceCache: nextCache, lastPriceUpdate: Date.now() };
    }),

  setSubscribedSymbols: (symbols) => set({ subscribedSymbols: symbols }),

  getPrice: (symbol) => get().priceCache[symbol]?.price ?? null,

  isConnected: () => {
    const { binanceStatus, supabaseStatus } = get();
    return binanceStatus === "connected" || supabaseStatus === "connected";
  },
}));
