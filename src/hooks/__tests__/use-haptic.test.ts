import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHaptic } from "../use-haptic";

describe("useHaptic", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { vibrate: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls navigator.vibrate with light duration by default", () => {
    const { result } = renderHook(() => useHaptic());
    result.current();
    expect(navigator.vibrate).toHaveBeenCalledWith(10);
  });

  it("calls navigator.vibrate with medium duration when requested", () => {
    const { result } = renderHook(() => useHaptic());
    result.current("medium");
    expect(navigator.vibrate).toHaveBeenCalledWith(20);
  });

  it("calls navigator.vibrate with pattern for success", () => {
    const { result } = renderHook(() => useHaptic());
    result.current("success");
    expect(navigator.vibrate).toHaveBeenCalledWith([20, 30, 20]);
  });

  it("does nothing for 'none' pattern", () => {
    const { result } = renderHook(() => useHaptic());
    result.current("none");
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });

  it("uses iOS webkit haptic when available", () => {
    const postMessage = vi.fn();
    const w = window as unknown as Record<string, unknown>;
    w.webkit = {
      messageHandlers: { haptic: { postMessage } },
    };

    const { result } = renderHook(() => useHaptic());
    result.current("medium");

    expect(postMessage).toHaveBeenCalledWith({
      type: "impactOccurred",
      style: "medium",
    });
    expect(navigator.vibrate).not.toHaveBeenCalled();

    delete w.webkit;
  });

  it("falls back to Vibration API when iOS handler is absent", () => {
    const { result } = renderHook(() => useHaptic());
    result.current("heavy");
    expect(navigator.vibrate).toHaveBeenCalledWith(30);
  });
});
