import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePullToRefresh } from "../use-pull-to-refresh";

function createTouchEvent(clientY: number) {
  return {
    touches: [{ clientY }],
    preventDefault: vi.fn(),
  } as unknown as React.TouchEvent<HTMLElement>;
}

function createStartEvent(clientY: number, scrollTop = 0) {
  const target = document.createElement("div");
  target.scrollTop = scrollTop;
  return {
    touches: [{ clientY }],
    currentTarget: target,
    preventDefault: vi.fn(),
  } as unknown as React.TouchEvent<HTMLElement>;
}

describe("usePullToRefresh", () => {
  it("does not trigger refresh when not at scroll top", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh({ onRefresh }));

    act(() => result.current.handlers.onTouchStart(createStartEvent(0, 100)));
    act(() => result.current.handlers.onTouchMove(createTouchEvent(200)));

    await act(async () => {
      result.current.handlers.onTouchEnd();
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("triggers refresh when pulled past threshold", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh({ onRefresh, threshold: 80 }));

    act(() => result.current.handlers.onTouchStart(createStartEvent(0, 0)));
    act(() => result.current.handlers.onTouchMove(createTouchEvent(150)));

    await act(async () => {
      result.current.handlers.onTouchEnd();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("caps distance at maxDistance with resistance", () => {
    const { result } = renderHook(() =>
      usePullToRefresh({
        onRefresh: vi.fn(),
        maxDistance: 120,
        resistance: 0.5,
      })
    );

    act(() => result.current.handlers.onTouchStart(createStartEvent(0, 0)));
    act(() => result.current.handlers.onTouchMove(createTouchEvent(500)));

    expect(result.current.state.distance).toBeLessThanOrEqual(120);
  });

  it("signals ready to release when threshold is reached", () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh: vi.fn(), threshold: 80, resistance: 1 })
    );

    act(() => result.current.handlers.onTouchStart(createStartEvent(0, 0)));
    act(() => result.current.handlers.onTouchMove(createTouchEvent(100)));

    expect(result.current.state.isReadyToRelease).toBe(true);
  });

  it("resets state after refresh completes", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh({ onRefresh, threshold: 80 }));

    act(() => result.current.handlers.onTouchStart(createStartEvent(0, 0)));
    act(() => result.current.handlers.onTouchMove(createTouchEvent(150)));

    await act(async () => {
      result.current.handlers.onTouchEnd();
    });

    expect(result.current.state.isRefreshing).toBe(false);
    expect(result.current.state.distance).toBe(0);
  });
});
