import * as React from "react";
import { render, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCockpitRealtime } from "../hooks/useCockpitRealtime";

interface MockChannel {
  name: string;
  on: (
    event: string,
    config: Record<string, unknown>,
    handler: (payload?: { new: Record<string, unknown> }) => void,
  ) => MockChannel;
  subscribe: (callback?: (status: string) => void) => MockChannel;
}

let mockHidden = false;
let channelListeners: Array<{
  config: Record<string, unknown>;
  handler: (payload?: { new: Record<string, unknown> }) => void;
}> = [];
let subscribeStatus: string | null = null;
let currentChannel: MockChannel | null = null;

const mockGetSession = vi.fn().mockResolvedValue({
  data: { session: { access_token: "token-123" } },
});

const mockSetAuth = vi.fn().mockResolvedValue(undefined);
const mockRemoveChannel = vi.fn().mockResolvedValue("ok");

function createMockChannel(name: string): MockChannel {
  channelListeners = [];
  subscribeStatus = null;

  const channel: MockChannel = {
    name,
    on: (event, config, handler) => {
      channelListeners.push({ config: { event, ...config }, handler });
      return channel;
    },
    subscribe: (callback) => {
      subscribeStatus = "SUBSCRIBED";
      callback?.("SUBSCRIBED");
      return channel;
    },
  };

  return channel;
}

const mockChannel = vi.fn().mockImplementation((name: string) => {
  currentChannel = createMockChannel(name);
  return currentChannel;
});

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: vi.fn().mockReturnValue({
        subscription: { unsubscribe: vi.fn() },
      }),
    },
    realtime: {
      setAuth: mockSetAuth,
    },
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  }),
}));

function TestComponent({
  userId,
  mode,
  activeTab,
  onRefresh,
  onRefreshTrades,
  onInvalidateAnalytics,
  onTradeInsert,
  onTradeUpdate,
}: {
  userId: string;
  mode: "paper" | "live";
  activeTab: "overview" | "trades" | "analysis";
  onRefresh: () => Promise<void>;
  onRefreshTrades: () => Promise<void>;
  onInvalidateAnalytics: () => void;
  onTradeInsert?: (trade: Record<string, unknown>) => void;
  onTradeUpdate?: (trade: Record<string, unknown>) => void;
}) {
  const { isSubscribed } = useCockpitRealtime({
    userId,
    mode,
    activeTab,
    onRefresh,
    onRefreshTrades,
    onInvalidateAnalytics,
    onTradeInsert,
    onTradeUpdate,
  });

  return <span data-testid="subscribed">{isSubscribed ? "yes" : "no"}</span>;
}

describe("useCockpitRealtime", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockHidden = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => mockHidden,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("subscribes to trades and trading_sessions changes for the user", async () => {
    render(
      <TestComponent
        userId="user-1"
        mode="paper"
        activeTab="overview"
        onRefresh={vi.fn().mockResolvedValue(undefined)}
        onRefreshTrades={vi.fn().mockResolvedValue(undefined)}
        onInvalidateAnalytics={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledWith("trading-cockpit:user-1:paper");
    });

    const tables = channelListeners.map((l) => l.config.table);
    expect(tables).toContain("trades");
    expect(tables).toContain("trading_sessions");

    const tradesListeners = channelListeners.filter(
      (l) => l.config.table === "trades",
    );
    expect(tradesListeners.map((l) => l.config.event)).toEqual([
      "INSERT",
      "UPDATE",
    ]);
  });

  it("debounces refresh callbacks after a realtime event", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onRefreshTrades = vi.fn().mockResolvedValue(undefined);

    render(
      <TestComponent
        userId="user-1"
        mode="paper"
        activeTab="overview"
        onRefresh={onRefresh}
        onRefreshTrades={onRefreshTrades}
        onInvalidateAnalytics={vi.fn()}
      />,
    );

    await waitFor(() => expect(channelListeners.length).toBeGreaterThan(0));

    act(() => {
      channelListeners[0].handler({ new: {} });
    });

    expect(onRefresh).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(800);
    });

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalledTimes(1);
      expect(onRefreshTrades).toHaveBeenCalledTimes(1);
    });
  });

  it("invalidates analytics when analysis tab is active", async () => {
    const onInvalidateAnalytics = vi.fn();

    render(
      <TestComponent
        userId="user-1"
        mode="paper"
        activeTab="analysis"
        onRefresh={vi.fn().mockResolvedValue(undefined)}
        onRefreshTrades={vi.fn().mockResolvedValue(undefined)}
        onInvalidateAnalytics={onInvalidateAnalytics}
      />,
    );

    await waitFor(() => expect(channelListeners.length).toBeGreaterThan(0));

    act(() => {
      channelListeners[0].handler({ new: {} });
    });

    act(() => {
      vi.advanceTimersByTime(800);
    });

    await waitFor(() => {
      expect(onInvalidateAnalytics).toHaveBeenCalledTimes(1);
    });
  });

  it("does not invalidate analytics when overview tab is active", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onInvalidateAnalytics = vi.fn();

    render(
      <TestComponent
        userId="user-1"
        mode="paper"
        activeTab="overview"
        onRefresh={onRefresh}
        onRefreshTrades={vi.fn().mockResolvedValue(undefined)}
        onInvalidateAnalytics={onInvalidateAnalytics}
      />,
    );

    await waitFor(() => expect(channelListeners.length).toBeGreaterThan(0));

    act(() => {
      channelListeners[0].handler({ new: {} });
    });

    act(() => {
      vi.advanceTimersByTime(800);
    });

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });

    expect(onInvalidateAnalytics).not.toHaveBeenCalled();
  });

  it("removes channel on visibility hidden and recreates on visible", async () => {
    render(
      <TestComponent
        userId="user-1"
        mode="paper"
        activeTab="overview"
        onRefresh={vi.fn().mockResolvedValue(undefined)}
        onRefreshTrades={vi.fn().mockResolvedValue(undefined)}
        onInvalidateAnalytics={vi.fn()}
      />,
    );

    await waitFor(() => expect(mockChannel).toHaveBeenCalledTimes(1));

    act(() => {
      mockHidden = true;
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
    });

    act(() => {
      mockHidden = false;
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledTimes(2);
    });
  });

  it("calls onTradeInsert with the new trade payload", async () => {
    const onTradeInsert = vi.fn();
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onRefreshTrades = vi.fn().mockResolvedValue(undefined);

    render(
      <TestComponent
        userId="user-1"
        mode="paper"
        activeTab="overview"
        onRefresh={onRefresh}
        onRefreshTrades={onRefreshTrades}
        onInvalidateAnalytics={vi.fn()}
        onTradeInsert={onTradeInsert}
      />,
    );

    await waitFor(() => expect(channelListeners.length).toBeGreaterThan(0));

    const insertListener = channelListeners.find(
      (l) => l.config.table === "trades" && l.config.event === "INSERT",
    );
    expect(insertListener).toBeDefined();

    const tradePayload = { new: { id: "trade-1", trading_pair: "BTCUSDT", side: "buy" } };
    act(() => {
      insertListener?.handler(tradePayload);
    });

    await waitFor(() => {
      expect(onTradeInsert).toHaveBeenCalledWith(tradePayload.new);
    });

    act(() => {
      vi.advanceTimersByTime(800);
    });

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalledTimes(1);
      expect(onRefreshTrades).toHaveBeenCalledTimes(1);
    });
  });

  it("calls onTradeUpdate with the updated trade payload", async () => {
    const onTradeUpdate = vi.fn();

    render(
      <TestComponent
        userId="user-1"
        mode="paper"
        activeTab="overview"
        onRefresh={vi.fn().mockResolvedValue(undefined)}
        onRefreshTrades={vi.fn().mockResolvedValue(undefined)}
        onInvalidateAnalytics={vi.fn()}
        onTradeUpdate={onTradeUpdate}
      />,
    );

    await waitFor(() => expect(channelListeners.length).toBeGreaterThan(0));

    const updateListener = channelListeners.find(
      (l) => l.config.table === "trades" && l.config.event === "UPDATE",
    );
    expect(updateListener).toBeDefined();

    const tradePayload = { new: { id: "trade-1", trading_pair: "BTCUSDT", side: "sell" } };
    act(() => {
      updateListener?.handler(tradePayload);
    });

    await waitFor(() => {
      expect(onTradeUpdate).toHaveBeenCalledWith(tradePayload.new);
    });
  });
});
